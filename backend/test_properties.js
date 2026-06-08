const prisma = require('./prismaClient.js');

async function run() {
  console.log("Starting test_properties.js...");
  try {
    const user = await prisma.user.findUnique({
      where: { email: "thiago@email.com" }, // or whatever email is tested
      include: {
        units: {
          include: {
            property: {
              include: {
                doorman: true,
                units: {
                  orderBy: { name: 'asc' },
                  include: {
                    residents: true
                  }
                }
              }
            }
          }
        },
        propertiesManaged: {
          include: {
            doorman: true,
            units: {
              orderBy: { name: 'asc' },
              include: {
                residents: true
              }
            }
          }
        },
        propertiesDoorman: {
          include: {
            doorman: true,
            units: {
              orderBy: { name: 'asc' },
              include: {
                residents: true
              }
            }
          }
        }
      }
    });
    console.log("Success! Found user:", !!user);
  } catch (err) {
    console.error("CRITICAL ERROR:", err);
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
