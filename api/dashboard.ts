export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Mock data for now - will connect to database later
    const metrics = {
      totalRevenue: 15000,
      monthlyRevenue: 4500,
      totalAppointments: 25,
      monthlyAppointments: 8,
      totalClients: 2,
      totalProfessionals: 0,
      conversionRate: 85.5,
      averageTicket: 50
    };

    return res.status(200).json({ metrics });

  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
}
