const fs = require('fs');
const path = require('path');
const prisma = require('./prismaClient');

async function migrate() {
  console.log('Iniciando migração de dados...');

  const dbPath = path.join(__dirname, 'db.json');
  const residentsDbPath = path.join(__dirname, 'residents.json');
  const visitorsDbPath = path.join(__dirname, 'visitors.json');
  const messagesDbPath = path.join(__dirname, 'messages.json');

  // 1. Propriedades e Unidades
  if (fs.existsSync(dbPath)) {
    const properties = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    for (const prop of properties) {
      await prisma.property.upsert({
        where: { id: prop.id },
        update: {},
        create: {
          id: prop.id,
          type: prop.type,
          name: prop.name,
          clientName: prop.clientName,
          clientPhone: prop.clientPhone,
          clientDocument: prop.clientDocument,
          clientAddress: prop.clientAddress,
          companyName: prop.companyName,
          plan: prop.plan,
          clientCode: prop.clientCode,
          doormanCode: prop.doormanCode,
          doormanEmail: prop.doormanEmail,
          qrCodeUrl: prop.qrCodeUrl,
          url: prop.url,
          adminEmail: prop.adminEmail,
          adminPassword: prop.adminPassword,
          createdAt: new Date(prop.createdAt),
          nextPaymentDate: new Date(prop.nextPaymentDate),
          units: {
            create: prop.units.map(u => ({
              id: u.id,
              name: u.name,
              block: u.block,
              street: u.street,
              number: u.number,
              accessCode: u.accessCode
            }))
          }
        }
      });
    }
    console.log('Propriedades e unidades migradas.');
  }

  // 2. Moradores
  if (fs.existsSync(residentsDbPath)) {
    const residents = JSON.parse(fs.readFileSync(residentsDbPath, 'utf8'));
    for (const res of residents) {
      // Garantir que a unidade existe antes de inserir
      const unitExists = await prisma.unit.findUnique({ where: { id: res.unitId } });
      if (unitExists) {
        await prisma.resident.upsert({
          where: { email_unitId: { email: res.email, unitId: res.unitId } },
          update: {},
          create: {
            email: res.email,
            unitId: res.unitId,
            propertyId: res.propertyId,
            propertyName: res.propertyName,
            createdAt: new Date(res.createdAt)
          }
        });
      }
    }
    console.log('Moradores migrados.');
  }

  // 3. Visitantes
  if (fs.existsSync(visitorsDbPath)) {
    const visitors = JSON.parse(fs.readFileSync(visitorsDbPath, 'utf8'));
    for (const vis of visitors) {
      const unitExists = await prisma.unit.findUnique({ where: { id: vis.unitId } });
      if (unitExists) {
        await prisma.visitor.create({
          data: {
            id: vis.id,
            unitId: vis.unitId,
            propertyId: vis.propertyId,
            visitorSocketId: vis.visitorSocketId,
            photo: vis.photo,
            callerName: vis.callerName,
            timestamp: new Date(vis.timestamp)
          }
        });
      }
    }
    console.log('Visitantes migrados.');
  }

  // 4. Mensagens
  if (fs.existsSync(messagesDbPath)) {
    const messages = JSON.parse(fs.readFileSync(messagesDbPath, 'utf8'));
    for (const msg of messages) {
      await prisma.message.create({
        data: {
          id: msg.id,
          propertyId: msg.propertyId,
          propertyName: msg.propertyName,
          title: msg.title,
          body: msg.body,
          priority: msg.priority,
          senderEmail: msg.senderEmail,
          createdAt: new Date(msg.createdAt),
          readBy: msg.readBy
        }
      });
    }
    console.log('Mensagens migradas.');
  }

  console.log('Migração concluída com sucesso!');
}

migrate()
  .catch(e => {
    console.error('Erro na migração:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
