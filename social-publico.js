// Proyección pública: solo foto reducida de perfil, nunca archivos privados originales.
import { almacen } from './almacenamiento.js?v=15';
import { leerArchivo } from './multimedia.js?v=15';
import { sb, resultado } from './supabase.js?v=11';

const rpc=(accion,datos={})=>resultado(sb.rpc('mimo_v16',{accion,datos}));

export async function sincronizarFotoPublica(){
  const texto=almacen.getItem('mimo_persona_v1');
  if(!texto)return;
  let p;try{p=JSON.parse(texto);}catch{return;}
  if(!p?.creado)return;
  const estado=await rpc('mi_estado');
  if(!estado)return;
  const origen=p.fotoId?String(p.fotoId):'';
  if((estado.foto_origen||'')===origen)return;
  if(!origen){await rpc('guardar_foto',{foto:null,origen:null});return;}
  const blob=await leerArchivo(origen);
  if(!blob)return; // No sustituir una foto existente si el archivo no está disponible.
  const bitmap=await createImageBitmap(blob);
  let foto='';
  try{
    const lado=Math.max(bitmap.width,bitmap.height);
    for(const max of [160,128,96,72]){
      const escala=Math.min(1,max/lado);
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(bitmap.width*escala));
      canvas.height=Math.max(1,Math.round(bitmap.height*escala));
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      foto=canvas.toDataURL('image/jpeg',0.7);
      if(foto.length<=85000)break;
    }
  }finally{bitmap.close();}
  if(foto.length>85000)throw Error('La miniatura de perfil es demasiado grande.');
  await rpc('guardar_foto',{foto,origen});
}
