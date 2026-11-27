-- Corrección de auditoría: desambiguar el parámetro propietario en la ficha pública.
create or replace function public.mimo_ficha_mascota_v1(
  propietario uuid, mascota text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); resultado jsonb;
begin
 if u is null then raise exception 'Iniciá sesión'; end if;
 if $1 is null or $2 is null or char_length($2)>100 then
   raise exception 'Mascota no disponible';
 end if;
 if not exists(
   select 1 from mimo_v13_privado.perfiles p
   join auth.users a on a.id=p.id
   where p.id=$1
     and a.email_confirmed_at is not null and a.deleted_at is null
     and not coalesce(a.is_anonymous,false)
     and (not p.privado or p.id=u or exists(
       select 1 from mimo_v13_privado.seguidores s where s.origen=u and s.destino=$1
     ))
     and not exists(select 1 from mimo_v13_privado.bloqueos b
       where (b.origen=u and b.destino=$1) or (b.origen=$1 and b.destino=u))
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
 where d.propietario=$1 and d.clave='mimo_mascotas'
   and m.value->>'demo' is distinct from 'true'
   and m.value->>'id'=$2 and char_length(btrim(coalesce(m.value->>'nombre','')))>0
 limit 1;
 return coalesce(resultado,'null'::jsonb);
end $$;