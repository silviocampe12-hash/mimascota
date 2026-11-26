// Exclusivamente clave PUBLICABLE. Nunca colocar claves secretas en este archivo.
export const PROJECT_URL='https://okdyvneokhdmbvytnoin.supabase.co';
export const PUBLISHABLE_KEY='sb_publishable_c1z_Rh8R7Q53T52_-8nE6g_NcDTGE4c';
export const REDIRECT_URL='https://silviocampe12-hash.github.io/mimascota/';
export const sb=globalThis.supabase?.createClient(PROJECT_URL,PUBLISHABLE_KEY,{auth:{storage:globalThis.sessionStorage,storageKey:'mimo-auth-v11',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}});
export function exigirCliente(){if(!sb)throw Error('No se pudo cargar la conexión. Revisá internet y recargá.');return sb;}
export async function resultado(promesa){const {data,error}=await promesa;if(error)throw Error(error.message);return data;}
