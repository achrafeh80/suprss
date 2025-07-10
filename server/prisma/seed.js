const prisma = require('../src/prisma');
const bcrypt = require('bcrypt');
const Parser = require('rss-parser');
const parser = new Parser();

async function main() {
  console.log("Insertion de l'utilisateur admin par défaut...");
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin',
      darkMode: false,
      fontSize: 'MEDIUM'
    }
  });
  console.log(`Utilisateur admin créé: email=admin@example.com, mot de passe=admin123 (haché).`);

  console.log("Création d'une collection personnelle pour admin...");
  const defaultCollection = await prisma.collection.create({
    data: {
      name: 'Mes Flux',
      ownerId: admin.id,
      memberships: { create: { userId: admin.id, role: 'OWNER' } }
    }
  });

  console.log("Ajout d'un flux RSS de démonstration...");
  const feedUrl = 'http://feeds.bbci.co.uk/news/world/rss.xml';
  const parsed = await parser.parseURL(feedUrl);
  const feed = await prisma.feed.create({
    data: {
      title: parsed.title || 'BBC World News',
      url: feedUrl,
      description: parsed.description || 'BBC World News RSS Feed',
      tags: ['news'],
      status: 'active',
      updateInterval: 60,
      lastFetched: new Date()
    }
  });
  // Lier le feed à la collection
  await prisma.collectionFeed.create({
    data: {
      collectionId: defaultCollection.id,
      feedId: feed.id
    }
  });
  // Insérer les derniers articles du flux
  const items = parsed.items || [];
  const latestItems = items.slice(0, 5); // on limite à 5 articles récents
  for (let item of latestItems) {
    const guid = item.guid || item.id || item.link;
    if (!guid) continue;
    let pubDate = item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : new Date());
    try {
      await prisma.article.create({
        data: {
          feedId: feed.id,
          title: item.title || "(Sans titre)",
          link: item.link || guid,
          guid: guid,
          author: item.creator || item.author || "Unknown",
          content: item.contentSnippet || item.content || "",
          published: pubDate
        }
      });
    } catch (err) {
      // ignore duplicates
    }
  }
  console.log(`Flux '${feed.title}' ajouté avec ${latestItems.length} articles.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
