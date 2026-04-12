import { supabase } from './db';

let isRunning = false;

export function startBrainEngine() {
  if (isRunning) return;
  isRunning = true;
  
  console.log('[BRAIN ENGINE] 24/7 Learning Activated');
  
  setInterval(async () => {
    try {
      const { data: currentData, error: fetchError } = await supabase
        .from('ai_state')
        .select('iq, learning_cycles')
        .eq('id', 1)
        .single();
      
      if (fetchError) throw fetchError;
      
      const currentIQ = currentData?.iq || 72500;
      const newIQ = currentIQ + Math.floor(Math.random() * 3) + 1;
      const newCycles = (currentData?.learning_cycles || 0) + 1;
      
      const { error: updateError } = await supabase
        .from('ai_state')
        .update({ 
          iq: newIQ, 
          learning_cycles: newCycles,
          last_updated: new Date().toISOString()
        })
        .eq('id', 1);
        
      if (updateError) throw updateError;
      
      console.log(`[BRAIN] IQ: ${currentIQ} → ${newIQ} | Cycles: ${newCycles}`);
    } catch (err) {
      console.error('[BRAIN ENGINE] Error:', err.message);
    }
  }, 5000);
}
