const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
    // Create default admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = await prisma.user.upsert({
        where: { email: "admin@company.com" },
        update: {},
        create: {
            email: "admin@company.com",
            password: hashedPassword,
            name: "Admin User",
            role: "ADMIN",
        },
    });

    console.log("Created admin user:", admin.email);

    // Create default lead sources
    const sources = [
        "Website",
        "WhatsApp",
        "Referral",
        "IndiaMart",
        "Cold Call",
        "Social Media",
    ];

    for (const sourceName of sources) {
        await prisma.leadSource.upsert({
            where: { name: sourceName },
            update: {},
            create: { name: sourceName },
        });
    }

    console.log("Created default lead sources:", sources.join(", "));

    // Create default tags
    const tags = [
        { name: "Hot Lead", color: "#ef4444" },
        { name: "Follow Up", color: "#f59e0b" },
        { name: "WordPress", color: "#3b82f6" },
        { name: "SEO", color: "#10b981" },
        { name: "App Development", color: "#8b5cf6" },
        { name: "Digital Marketing", color: "#ec4899" },
        { name: "Web Development", color: "#06b6d4" },
    ];

    for (const tag of tags) {
        await prisma.tag.upsert({
            where: { name: tag.name },
            update: {},
            create: tag,
        });
    }

    console.log("Created default tags");
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
