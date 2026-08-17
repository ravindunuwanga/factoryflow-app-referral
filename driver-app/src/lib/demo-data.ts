import { supabase } from './supabase';

export async function seedDemoData() {
  // 1. Check if orders exist
  const { data: existingOrders } = await supabase.from('orders').select('id').limit(1);
  
  if (existingOrders && existingOrders.length > 0) {
    console.log('Demo data already exists');
    return;
  }

  console.log('Seeding demo data...');

  // 2. Create a Driver Profile (if not exists)
  // Note: This assumes you have auth handled or you're using a specific UUID
  const driverId = '00000000-0000-0000-0000-000000000000'; // Placeholder or real ID

  // 3. Create a Vehicle
  const { data: vehicle, error: vError } = await supabase
    .from('vehicles')
    .insert({
      vehicle_number: 'WP-CAS-1029',
      model: 'Tata Ace',
      status: 'available',
      current_lat: 6.9271,
      current_lng: 79.8612
    })
    .select()
    .single();

  if (vError) console.error('Error seeding vehicle:', vError);

  // 4. Create an Order
  const { data: order, error: oError } = await supabase
    .from('orders')
    .insert({
      order_number: 'ORD-7390',
      client_name: 'Zenith Inc',
      status: 'in_production',
      total_stages: 7,
      current_stage_index: 6
    })
    .select()
    .single();

  if (oError) console.error('Error seeding order:', oError);

  // 5. Create a Delivery
  if (order && vehicle) {
    const { error: dError } = await supabase
      .from('deliveries')
      .insert({
        order_id: order.id,
        vehicle_id: vehicle.id,
        status: 'pending',
        eta: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
      });
    
    if (dError) console.error('Error seeding delivery:', dError);
  }
}
