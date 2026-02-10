const supabaseUrl = "https://vkpyzbxczxlnnuxrqdlo.supabase.co";
const supabaseKey = "sb_publishable_4CgPYh5cw8GFFaFtxeTEdw_dFybiO-k";

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

window.supabaseClient = supabaseClient;
