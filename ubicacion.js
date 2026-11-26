// Ubicación del perfil: GPS privado y clasificación geográfica pública.
const CODIGOS = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW '.trim().split(' ');
const nombres = new Intl.DisplayNames(['es'], {type:'region'});
export const PAISES = CODIGOS.map(c=>({codigo:c,nombre:nombres.of(c)||c})).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
const texto=x=>String(x??'').trim().replace(/\s+/g,' ').slice(0,100);
const clave=x=>texto(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
export function ubicacionPublica(u={}) {
 const pais=texto(u?.pais).toUpperCase(),provincia=texto(u?.provincia),ciudad=texto(u?.ciudad);
 if(!CODIGOS.includes(pais)||!provincia||!ciudad)return null;
 return {pais,nombrePais:nombres.of(pais),provincia,ciudad,claveCiudad:JSON.stringify([pais,clave(provincia),clave(ciudad)])};
}
export function coordenadasValidas(c){
 return !!c&&Number.isFinite(c.latitud)&&Math.abs(c.latitud)<=90&&Number.isFinite(c.longitud)&&Math.abs(c.longitud)<=180&&Number.isFinite(c.precision)&&c.precision>=0&&Number.isFinite(c.capturadaEn)&&c.capturadaEn>0;
}
export function validarUbicacion(u,requiereGPS=false){
 const pub=ubicacionPublica(u);
 if(!pub)throw Error('Completá país, provincia o región y ciudad.');
 const gps=coordenadasValidas(u.gps)?{latitud:u.gps.latitud,longitud:u.gps.longitud,precision:u.gps.precision,capturadaEn:u.gps.capturadaEn}:null;
 if(requiereGPS&&!gps)throw Error('Activá la ubicación desde la vivienda para ofrecer adopción u hogar provisorio.');
 return {pais:pub.pais,provincia:pub.provincia,ciudad:pub.ciudad,gps};
}
// Solicita un permiso puntual. No rastrea continuamente ni llama a servicios externos.
export function capturarUbicacion(geo=globalThis.navigator?.geolocation){
 return new Promise((resolve,reject)=>{
  if(!geo?.getCurrentPosition){reject(Error('Este navegador no permite obtener tu ubicación.'));return;}
  geo.getCurrentPosition(p=>{
   const gps={latitud:p.coords.latitude,longitud:p.coords.longitude,precision:p.coords.accuracy,capturadaEn:p.timestamp};
   if(!coordenadasValidas(gps)){reject(Error('La ubicación recibida no es válida.'));return;}
   resolve(gps);
  },e=>reject(Error(({1:'Permiso de ubicación denegado. Habilitalo en el navegador.',2:'No se pudo determinar la ubicación. Probá desde el celular.',3:'No se obtuvo ubicación a tiempo. Volvé a intentarlo.'})[e.code]||'No se pudo obtener la ubicación.')),{enableHighAccuracy:true,maximumAge:0,timeout:20000});
 });
}
