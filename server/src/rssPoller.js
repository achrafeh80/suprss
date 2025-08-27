const prisma = require('./prisma');
const Parser = require('rss-parser');
const parser = new Parser();

const CHECK_INTERVAL = 5 * 60 * 1000; 

async function pollFeeds() {
  try {
    const feeds = await prisma.feed.findMany({ where: { status: 'active' } });
    const now = new Date();
    for (let feed of feeds) {
      if (!feed.lastFetched || (now - feed.lastFetched) / 60000 >= feed.updateInterval) {
        try {
          const parsed = await parser.parseURL(feed.url);
          await prisma.feed.update({
            where: { id: feed.id },
            data: { lastFetched: new Date() }
          });
          const items = parsed.items || [];
          for (let item of items) {
            const guid = item.guid || item.id || item.link;
            if (!guid) continue;
            let pubDate = item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : new Date());
            await prisma.article.create({
              data: {
                feedId: feed.id,
                title: item.title || "(Sans titre)",
                link: item.link || guid,
                guid: guid,
                author: item.creator || item.author || "",
                content: item.contentSnippet || item.content || "",
                published: pubDate
              }
            }).catch(err => {
            });
          }
        } catch (err) {
          console.error(`Erreur lors de la mise à jour du flux ${feed.url}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error("Erreur du poller RSS:", err);
  }
}

setInterval(pollFeeds, CHECK_INTERVAL);
console.log(`✅ Tâche de vérification des flux RSS lancée (toutes les ${CHECK_INTERVAL/60000} minutes).`);
