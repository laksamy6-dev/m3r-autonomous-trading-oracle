const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gkqjxplzdypaekpcfuqe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrcWp4cGx6ZHlwYWVrcGNmdXFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkzMDc5MSwiZXhwIjoyMDg3NTA2NzkxfQ.GckVZLJFjRfLAaj-rbS50q4V9PZaf5AsodbuOl8NLKo'  // Get from dashboard
);

async function test() {
  // Test trades table
  const { data: trades, error } = await supabase
    .from('trades')
    .select('*')
    .limit(5);
    
  if (error) console.error('Error:', error);
  else console.log('Trades:', trades);
  
  // Test brain_memories
  const { data: memories } = await supabase
    .from('brain_memories')
    .select('*')
    .limit(3);
    
  console.log('Memories:', memories);
}

test();
