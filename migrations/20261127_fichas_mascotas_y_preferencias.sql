-- Auditoría Mimos: búsqueda con perfiles públicos de mascota y preferencias
-- de privacidad de publicaciones, sin exponer el JSON clínico o el domicilio.
alter table mimo_v13_privado.perfiles
  add column if not exists mostrar_en_comunidad boolean not null default true,
  add column if not exists permitir_comentarios boolean not null default true;

create or replace function public.mimo_preferencias_publicaciones(
  accion text,
  mostrar boolean default null,
  comentarios boolean default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); result jsonb;
begin
 if u is null then raise exception 'Iniciá sesión'; end if;
 if accion='guardar' then
   if mostrar is null or comentarios is null then raise exception 'Indicá ambas preferencias'; end if;
   update mimo_v13_privado.perfiles set mostrar_en_comunidad=mostrar,permitir_comentarios=comentarios
     where id=u;
   if not found then raise exception 'Perfil no disponible'; end if;
 elsif accion<>'leer' then
   raise exception 'Operación no disponible';
 end if;
 select jsonb_build_object('mostrar',p.mostrar_en_comunidad,'comentarios',p.permitir_comentarios)
   into result from mimo_v13_privado.perfiles p where p.id=u;
 return coalesce(result,'{"mostrar":true,"comentarios":true}'::jsonb);
end $$;
revoke all on function public.mimo_preferencias_publicaciones(text,boolean,boolean) from public,anon;
grant execute on function public.mimo_preferencias_publicaciones(text,boolean,boolean) to authenticated;

-- Envolver la búsqueda verificada existente y añadir solo la ficha pública mínima
-- para cada mascota visible. Los perfiles privados se mantienen ocultos hasta aceptar seguimiento.
create or replace function public.mimo_buscar_v2(consulta text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); resultado jsonb;
begin
 if u is null then raise exception 'Iniciá sesión'; end if;
 select coalesce(jsonb_agg(
   (x.value - 'mascotas') || jsonb_build_object('mascotas',
     case
       when (x.value->>'privado')::boolean and not coalesce((x.value->>'seguido')::boolean,false)
           and x.value->>'id'<>u::text then '[]'::jsonb
       else coalesce((
         select jsonb_agg(jsonb_build_object(
           'id',left(coalesce(m.value->>'id',''),100),
           'nombre',left(btrim(coalesce(m.value->>'nombre','')),40),
           'especie',left(btrim(coalesce(m.value->>'especie',m.value->>'tipo','Mascota')),60),
           'raza',left(btrim(coalesce(m.value->>'raza','')),80)
         ) order by m.ord)
         from public.mimo_cuenta_datos d
         cross join lateral jsonb_array_elements(
           case when jsonb_typeof(d.contenido)='array' then d.contenido else '[]'::jsonb end
         ) with ordinality m(value,ord)
         where d.propietario=(x.value->>'id')::uuid and d.clave='mimo_mascotas'
           and m.value->>'demo' is distinct from 'true'
           and char_length(btrim(coalesce(m.value->>'nombre','')))>0
       ),'[]'::jsonb)
     end
   )
  order by x.ordinality),'[]'::jsonb) into resultado
 from jsonb_array_elements(public.mimo_v16('buscar',jsonb_build_object('q',left(coalesce(consulta,''),80))))
 with ordinality x(value,ordinality);
 return resultado;
end $$;
revoke all on function public.mimo_buscar_v2(text) from public,anon;
grant execute on function public.mimo_buscar_v2(text) to authenticated;

-- Ficha visible exclusivamente de UNA mascota. Ni expediente clínico ni datos privados.
create or replace function public.mimo_ficha_mascota_v1(
  propietario uuid, mascota text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); resultado jsonb;
begin
 if u is null then raise exception 'Iniciá sesión'; end if;
 if propietario is null or mascota is null or char_length(mascota)>100 then
   raise exception 'Mascota no disponible';
 end if;
 if not exists(
   select 1 from mimo_v13_privado.perfiles p
   join auth.users a on a.id=p.id
   where p.id=propietario
     and a.email_confirmed_at is not null and a.deleted_at is null
     and not coalesce(a.is_anonymous,false)
     and (not p.privado or p.id=u or exists(
       select 1 from mimo_v13_privado.seguidores s where s.origen=u and s.destino=propietario
     ))
     and not exists(select 1 from mimo_v13_privado.bloqueos b
       where (b.origen=u and b.destino=propietario) or (b.origen=propietario and b.destino=u))
 ) then raise exception 'Mascota no disponible'; end if;
 select jsonb_build_object(
   'id',left(m.value->>'id',100),
   'nombre',left(btrim(coalesce(m.value->>'nombre','')),40),
   'especie',left(btrim(coalesce(m.value->>'especie',m.value->>'tipo','Mascota')),60),
   'raza',left(btrim(coalesce(m.value->>'raza','')),80),
   'sexo',left(btrim(coalesce(m.value->>'sexo','')),40),
   'color',left(btrim(coalesce(m.value->>'color','')),100),
   'tamano',left(btrim(coalesce(m.value->>'tamano','')),80)
 ) into resultado
 from public.mimo_cuenta_datos d
 cross join lateral jsonb_array_elements(case when jsonb_typeof(d.contenido)='array'
   then d.contenido else '[]'::jsonb end) m
 where d.propietario=propietario and d.clave='mimo_mascotas'
   and m.value->>'demo' is distinct from 'true'
   and m.value->>'id'=mascota and char_length(btrim(coalesce(m.value->>'nombre','')))>0
 limit 1;
 return coalesce(resultado,'null'::jsonb);
end $$;
revoke all on function public.mimo_ficha_mascota_v1(uuid,text) from public,anon;
grant execute on function public.mimo_ficha_mascota_v1(uuid,text) to authenticated;
