export function ensureGenFields(obj:any){
  try{
    if(!obj) return obj;
    if(obj.generation !== undefined && obj.gen === undefined) obj.gen = obj.generation;
    if(obj.gen !== undefined && obj.generation === undefined) obj.generation = obj.gen;
    if(obj.total_interactions !== undefined && obj.interactions === undefined) obj.interactions = obj.total_interactions;
    if(obj.interactions !== undefined && obj.total_interactions === undefined) obj.total_interactions = obj.interactions;
  }catch(e){}
  return obj;
}
