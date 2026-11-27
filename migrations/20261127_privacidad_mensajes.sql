-- Evitar que una llamada directa a la API antigua envíe mensajes a un perfil privado
-- sin haber obtenido antes la aprobación de seguimiento.
create or replace function mimo_v13_privado.proteger_mensaje_privado()
returns trigger language plpgsql security definer set search_path='' as $$
declare destinatario uuid;
begin
 select case when c.a=new.emisor then c.b else c.a end into destinatario
 from mimo_v13_privado.chats c where c.id=new.chat and new.emisor in (c.a,c.b);
 if destinatario is null then raise exception 'Conversación no disponible'; end if;
 if exists(select 1 from mimo_v13_privado.perfiles p where p.id=destinatario and p.privado)
    and not exists(select 1 from mimo_v13_privado.seguidores s
                   where s.origen=new.emisor and s.destino=destinatario)
 then raise exception 'Este perfil privado requiere una solicitud de seguimiento aceptada antes de recibir mensajes'; end if;
 return new;
end; $$;
drop trigger if exists mimo_mensaje_privado on mimo_v13_privado.mensajes;
create trigger mimo_mensaje_privado before insert on mimo_v13_privado.mensajes
for each row execute function mimo_v13_privado.proteger_mensaje_privado();
