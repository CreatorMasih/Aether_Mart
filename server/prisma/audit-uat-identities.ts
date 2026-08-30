import { prisma } from '../src/config/database.config';

async function auditIdentities() {
  console.log('=== UAT IDENTITY AUDIT ===\n');

  const targets = [
    { label: 'ADMIN', identifier: '123pratikkumar@gmail.com' },
    { label: 'CUSTOMER', identifier: '+919876543210' },
    { label: 'SHOPKEEPER', identifier: '+918888888881' },
    { label: 'RIDER', identifier: '+917777777771' },
  ];

  for (const t of targets) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: t.identifier }, { phone: t.identifier }],
      },
      include: {
        customer: true,
        merchant: { include: { store: true } },
        rider: true,
      },
    });

    if (!user) {
      console.log(`❌ ${t.label} (${t.identifier}): NOT FOUND IN DATABASE`);
      continue;
    }

    let profileId = 'NONE';
    let profileUserId = 'NONE';
    let match = false;

    if (user.role === 'CUSTOMER' && user.customer) {
      profileId = user.customer.id;
      profileUserId = user.customer.userId;
      match = profileUserId === user.id;
    } else if (user.role === 'SHOPKEEPER' && user.merchant) {
      profileId = user.merchant.id;
      profileUserId = user.merchant.userId;
      match = profileUserId === user.id;
    } else if (user.role === 'RIDER' && user.rider) {
      profileId = user.rider.id;
      profileUserId = user.rider.userId;
      match = profileUserId === user.id;
    } else if (user.role === 'ADMIN') {
      profileId = 'ADMIN_PERMISSIONS';
      profileUserId = user.id;
      match = true;
    }

    console.log(`Identity       : ${t.label} (${t.identifier})`);
    console.log(`User ID        : ${user.id}`);
    console.log(`Role           : ${user.role}`);
    console.log(`Profile ID     : ${profileId}`);
    console.log(`Profile userId : ${profileUserId}`);
    console.log(`Match          : ${match ? 'YES ✅' : 'NO ❌'}`);
    if (user.merchant?.store) {
      console.log(`Store ID       : ${user.merchant.store.id} (${user.merchant.store.name})`);
    }
    console.log('--------------------------------------------------');
  }

  process.exit(0);
}

auditIdentities().catch((err) => {
  console.error('Audit Error:', err);
  process.exit(1);
});
