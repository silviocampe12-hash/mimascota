// Preferencias de Comunidad respaldadas por Supabase (no son autorizaciones de administrador).
import { sb, resultado } from './supabase.js?v=11';

let preferencias={mostrar:true,comentarios:true};

export const preferenciasComunidad=()=>({...preferencias});

export async function cargarPreferenciasComunidad(){
  const datos=await resultado(sb.rpc('mimo_preferencias_publicaciones',{accion:'leer'}));
  preferencias={
    mostrar:datos?.mostrar!==false,
    comentarios:datos?.comentarios!==false
  };
  return preferenciasComunidad();
}
