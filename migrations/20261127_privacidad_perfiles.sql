
-- Mimos: perfiles públicos por defecto, privacidad opcional y mascotas automáticas.
-- Proyecta únicamente nombre y especie de mascotas; nunca salud, GPS, vivienda ni documentos.
alter table mimo_v13_privado.perfiles
  add column if not exists privado boolean not null default false,
  add column if not exists auto_nombre boolean not null default false,
  add column if not exists foto_publica text,
  add column if not exists foto_origen text;

create table if not exists mimo_v13_privado.solicitudes_seguimiento (
 solicitante uuid not null references mimo_v13_privado.perfiles(id) on delete cascade,
 destino uuid not null references mimo_v13_privado.perfiles(id) on delete cascade,
 estado text not null default 'pendiente' check (estado in ('pendiente','aceptada')),
 creado timestamptz not null default now(),
 actualizado timestamptz not null default now(),
 primary key (solicitante,destino),
 check (solicitante <> destino)
);
create index if not exists solicitudes_destino_estado_idx
 on mimo_v13_privado.solicitudes_seguimiento(destino,estado,creado);
alter table mimo_v13_privado.solicitudes_seguimiento enable row level security;
revoke all on mimo_v13_privado.solicitudes_seguimiento from public, anon, authenticated;

-- Al guardar un perfil personal se crea su identidad pública, sin casillas ni aprobación.
-- Un alias social configurado manualmente nunca es sobrescrito.
create or replace function mimo_v13_privado.proyectar_cuenta() returns trigger
language plpgsql security definer set search_path='' as $$
declare n text;
begin
 if new.clave='mimo_persona_v1' and new.contenido->>'creado'='true' then
  n:=left(btrim(concat_ws(' ',nullif(btrim(new.contenido->>'nombre'),''),nullif(btrim(new.contenido->>'apellido'),''))),80);
  if char_length(n)>0 then
   insert into mimo_v13_privado.perfiles(id,nombre,auto_nombre)
   values(new.propietario,n,true)
   on conflict(id) do update set nombre=case when mimo_v13_privado.perfiles.auto_nombre then excluded.nombre else mimo_v13_privado.perfiles.nombre end;
  end if;
 end if;
 return new;
end; $$;
drop trigger if exists mimo_publicar_perfil_cuenta on public.mimo_cuenta_datos;
create trigger mimo_publicar_perfil_cuenta
after insert or update of contenido on public.mimo_cuenta_datos
for each row execute function mimo_v13_privado.proyectar_cuenta();

-- Incorporar perfiles que ya habían sido creados en Mimos, sin alterar su alias.
insert into mimo_v13_privado.perfiles(id,nombre,auto_nombre)
select propietario,
 left(btrim(concat_ws(' ',nullif(btrim(contenido->>'nombre'),''),nullif(btrim(contenido->>'apellido'),''))),80),
 true
from public.mimo_cuenta_datos
where clave='mimo_persona_v1' and contenido->>'creado'='true'
  and char_length(btrim(concat_ws(' ',nullif(btrim(contenido->>'nombre'),''),nullif(btrim(contenido->>'apellido'),''))))>0
on conflict(id) do nothing;

-- Un seguimiento directo a un perfil privado debe contar con solicitud aceptada.
-- Abarca también llamadas antiguas a mimo_v13(seguir).
create or replace function mimo_v13_privado.proteger_seguimiento() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from mimo_v13_privado.bloqueos b
           where (b.origen=new.origen and b.destino=new.destino)
              or (b.origen=new.destino and b.destino=new.origen)) then
  raise exception 'No podés seguir a este perfil';
 end if;
 if exists(select 1 from mimo_v13_privado.perfiles p where p.id=new.destino and p.privado)
    and not exists(select 1 from mimo_v13_privado.solicitudes_seguimiento s
       where s.solicitante=new.origen and s.destino=new.destino and s.estado='aceptada') then
  raise exception 'Este perfil es privado. Enviá una solicitud de seguimiento.';
 end if;
 return new;
end; $$;
drop trigger if exists mimo_proteger_seguimiento on mimo_v13_privado.seguidores;
create trigger mimo_proteger_seguimiento before insert on mimo_v13_privado.seguidores
for each row execute function mimo_v13_privado.proteger_seguimiento();

-- Cuando alguien deja de seguir, su aprobación anterior deja de ser reutilizable.
create or replace function mimo_v13_privado.eliminar_solicitud_al_dejar() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 delete from mimo_v13_privado.solicitudes_seguimiento
 where solicitante=old.origen and destino=old.destino;
 return old;
end; $$;
drop trigger if exists mimo_cancelar_aprobacion on mimo_v13_privado.seguidores;
create trigger mimo_cancelar_aprobacion after delete on mimo_v13_privado.seguidores
for each row execute function mimo_v13_privado.eliminar_solicitud_al_dejar();

-- Bloquear siempre revoca solicitudes de seguimiento en ambas direcciones.
create or replace function mimo_v13_privado.limpiar_solicitudes_bloqueo() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 delete from mimo_v13_privado.solicitudes_seguimiento
 where (solicitante=new.origen and destino=new.destino)
    or (solicitante=new.destino and destino=new.origen);
 return new;
end; $$;
drop trigger if exists mimo_bloqueo_solicitudes on mimo_v13_privado.bloqueos;
create trigger mimo_bloqueo_solicitudes after insert on mimo_v13_privado.bloqueos
for each row execute function mimo_v13_privado.limpiar_solicitudes_bloqueo();

-- RPC: solo ofrece una proyección pública mínima; jamás devuelve el JSON privado.
create or replace function public.mimo_v16(accion text,datos jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); otro uuid; q text; priv boolean; resultado jsonb;
begin
 if u is null or not exists(select 1 from auth.users a where a.id=u and a.email_confirmed_at is not null and a.deleted_at is null and not coalesce(a.is_anonymous,false))
 then raise exception 'Iniciá sesión con una cuenta confirmada'; end if;

 if accion='buscar' then
  q:=translate(lower(btrim(coalesce(datos->>'q',''))),'áéíóúüñ','aeiouun');
  if char_length(q)>80 then raise exception 'Búsqueda demasiado larga'; end if;
  select coalesce(jsonb_agg(to_jsonb(z) order by z.nombre,z.id),'[]'::jsonb) into resultado
  from (
   select p.id,p.nombre,p.privado,p.foto_publica as foto,
     f.seguido,
     exists(select 1 from mimo_v13_privado.solicitudes_seguimiento s
        where s.solicitante=u and s.destino=p.id and s.estado='pendiente') as pendiente,
     (position(q in translate(lower(p.nombre),'áéíóúüñ','aeiouun'))>0) as coincide_persona,
     case when p.privado and not f.seguido and p.id<>u then '[]'::jsonb else pets.mascotas end as mascotas
   from mimo_v13_privado.perfiles p
   join auth.users a on a.id=p.id
   cross join lateral (
    select exists(select 1 from mimo_v13_privado.seguidores s
                  where s.origen=u and s.destino=p.id) as seguido
   ) f
   left join lateral (
    select coalesce(jsonb_agg(jsonb_build_object('nombre',left(btrim(m.value->>'nombre'),40),
           'especie',left(btrim(coalesce(m.value->>'especie',m.value->>'tipo','Mascota')),60))),'[]'::jsonb) as mascotas
    from public.mimo_cuenta_datos d
    cross join lateral jsonb_array_elements(
       case when jsonb_typeof(d.contenido)='array' then d.contenido else '[]'::jsonb end
    ) m
    where d.propietario=p.id and d.clave='mimo_mascotas'
      and m.value->>'demo' is distinct from 'true'
      and char_length(btrim(m.value->>'nombre'))>0
   ) pets on true
   where a.deleted_at is null and a.email_confirmed_at is not null and not coalesce(a.is_anonymous,false)
     and not exists(select 1 from mimo_v13_privado.bloqueos b where
        (b.origen=u and b.destino=p.id) or (b.origen=p.id and b.destino=u))
     and (
       q='' or position(q in translate(lower(p.nombre),'áéíóúüñ','aeiouun'))>0
       or (not p.privado or f.seguido or p.id=u)
          and exists(select 1 from jsonb_array_elements(pets.mascotas) pm
                     where position(q in translate(lower(pm->>'nombre'),'áéíóúüñ','aeiouun'))>0)
     )
   order by p.nombre,p.id limit 50
  ) z;
  return resultado;

 elsif accion='mi_estado' then
  return coalesce((select jsonb_build_object('privado',p.privado,'foto_origen',p.foto_origen)
       from mimo_v13_privado.perfiles p where p.id=u),'null'::jsonb);

 elsif accion='guardar_privacidad' then
  if jsonb_typeof(datos->'privado') is distinct from 'boolean' then raise exception 'Elegí público o privado'; end if;
  update mimo_v13_privado.perfiles set privado=(datos->>'privado')::boolean where id=u;
  if not found then raise exception 'Guardá tu perfil antes de cambiar la privacidad'; end if;
  return jsonb_build_object('privado',(datos->>'privado')::boolean);

 elsif accion='guardar_foto' then
  if (datos->>'foto') is not null and
    (char_length(datos->>'foto')>85000 or
     (datos->>'foto') !~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$') then
    raise exception 'La imagen pública no es válida'; end if;
  update mimo_v13_privado.perfiles
   set foto_publica=nullif(datos->>'foto',''),foto_origen=nullif(left(coalesce(datos->>'origen',''),100),'')
   where id=u;
  if not found then raise exception 'Perfil no disponible'; end if;
  return '{"ok":true}'::jsonb;

 elsif accion in ('seguir','dejar','bloquear','desbloquear','aceptar','rechazar') then
  otro:=(datos->>'persona')::uuid;
  if otro is null or otro=u then raise exception 'Perfil inválido'; end if;
  if not exists(select 1 from mimo_v13_privado.perfiles where id=u)
      or not exists(select 1 from mimo_v13_privado.perfiles where id=otro) then
    raise exception 'Perfil no disponible'; end if;
  perform pg_advisory_xact_lock(hashtextextended(least(u,otro)::text||greatest(u,otro)::text,13));
  if accion='bloquear' then
   insert into mimo_v13_privado.bloqueos(origen,destino) values(u,otro) on conflict do nothing;
   delete from mimo_v13_privado.seguidores where (origen=u and destino=otro) or (origen=otro and destino=u);
   return '{"ok":true}'::jsonb;
  elsif accion='desbloquear' then
   delete from mimo_v13_privado.bloqueos where origen=u and destino=otro;
   return '{"ok":true}'::jsonb;
  end if;
  if accion in ('aceptar','rechazar') then
   if not exists(select 1 from mimo_v13_privado.solicitudes_seguimiento s
       where s.destino=u and s.solicitante=otro and s.estado='pendiente') then
    raise exception 'Solicitud no disponible'; end if;
   if accion='rechazar' then
    delete from mimo_v13_privado.solicitudes_seguimiento where solicitante=otro and destino=u;
   else
    if exists(select 1 from mimo_v13_privado.bloqueos b
     where (b.origen=u and b.destino=otro) or (b.origen=otro and b.destino=u)) then
      raise exception 'El usuario está bloqueado'; end if;
    update mimo_v13_privado.solicitudes_seguimiento set estado='aceptada',actualizado=now()
      where solicitante=otro and destino=u;
    insert into mimo_v13_privado.seguidores(origen,destino) values(otro,u) on conflict do nothing;
   end if;
   return '{"ok":true}'::jsonb;
  end if;
  if accion='dejar' then
   delete from mimo_v13_privado.seguidores where origen=u and destino=otro;
   delete from mimo_v13_privado.solicitudes_seguimiento where solicitante=u and destino=otro;
   return '{"ok":true}'::jsonb;
  end if;
  if exists(select 1 from mimo_v13_privado.bloqueos b where
    (b.origen=u and b.destino=otro) or (b.origen=otro and b.destino=u)) then
    raise exception 'No podés seguir a este perfil'; end if;
  if exists(select 1 from mimo_v13_privado.seguidores where origen=u and destino=otro) then
   return '{"estado":"seguido"}'::jsonb;
  end if;
  select p.privado into priv from mimo_v13_privado.perfiles p where p.id=otro;
  if priv then
   insert into mimo_v13_privado.solicitudes_seguimiento(solicitante,destino,estado)
     values(u,otro,'pendiente')
     on conflict(solicitante,destino) do update set estado='pendiente',actualizado=now();
   return '{"estado":"pendiente"}'::jsonb;
  end if;
  insert into mimo_v13_privado.seguidores(origen,destino) values(u,otro) on conflict do nothing;
  return '{"estado":"seguido"}'::jsonb;

 elsif accion='solicitudes' then
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nombre',p.nombre,'foto',p.foto_publica)
         order by s.creado),'[]'::jsonb) into resultado
  from mimo_v13_privado.solicitudes_seguimiento s
  join mimo_v13_privado.perfiles p on p.id=s.solicitante
  where s.destino=u and s.estado='pendiente'
    and not exists(select 1 from mimo_v13_privado.bloqueos b where
       (b.origen=u and b.destino=p.id) or (b.origen=p.id and b.destino=u));
  return resultado;

 elsif accion='bloqueados' then
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nombre',p.nombre)
         order by p.nombre),'[]'::jsonb) into resultado
  from mimo_v13_privado.bloqueos b
  join mimo_v13_privado.perfiles p on p.id=b.destino where b.origen=u;
  return resultado;
 end if;
 raise exception 'Operación no disponible';
end; $$;
revoke all on function public.mimo_v16(text,jsonb) from public,anon;
grant execute on function public.mimo_v16(text,jsonb) to authenticated;

-- La API anterior de búsqueda ya no depende de casillas de visibilidad.
-- Conservar acciones antiguas de manera compatible sin poder alterar la búsqueda real.
create or replace function mimo_v13_privado.buscar_v14(accion text,datos jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if accion='mis_mascotas' or accion='guardar_mascotas' then
  return coalesce((select jsonb_agg(jsonb_build_object('nombre',m.value->>'nombre',
       'especie',coalesce(m.value->>'especie',m.value->>'tipo','Mascota')))
    from public.mimo_cuenta_datos d,
    lateral jsonb_array_elements(case when jsonb_typeof(d.contenido)='array'
       then d.contenido else '[]'::jsonb end) m
    where d.propietario=auth.uid() and d.clave='mimo_mascotas'
      and m.value->>'demo' is distinct from 'true'),'[]'::jsonb);
 end if;
 return public.mimo_v16(accion,datos);
end; $$;
