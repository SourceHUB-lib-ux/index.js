/* ===============================
   🔧 IMPORTS
   =============================== */
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const fs = require('fs');
require('dotenv').config();

/* ===============================
   🔧 CONFIG – EDITABLE SECTION
   =============================== */
const CONFIG = {
  command: '!getloadersource',
  buyerRoleName: '.source',
  logChannelId: '1452210363633500313',
  loaderMessage:
`🛡️ **Verified Loader**
\`\`\`lua
loadstring(game:HttpGet("https://raw.githubusercontent.com/SourceHUB-lib/Main/refs/heads/main/Source%3FLua"))()
\`\`\``,

  embed: {
    title: 'Premium Key & Access Information',
    description:
`**Boosting Options**
• 1 Boost = 15 days access
• 2 Boosts = 30 days access

**Accepted Payments**
PayPal FnF, Wise, Remitly, Crypto, GiftCards, GCash.
Mastercard and Debitcard, Bank transfer

**Mobile Users**
Keys are unique and non-transferable. Support responds within 24 hours.

**Information**
• Get key from Source HUB
• Use Get Role to redeem your key 
• Use Get Loader after claiming Role
• [Supported executors](https://sourcestore.mysellauth.com/blog/supported-executor)
• [Mobile info](https://discord.com/channels/1372910832392081420/1395125125732372594/)

**Fast delivery • Secure payment • 24/7 Support**
━━━━━━━━━━━━━━━━━━━━━━
By purchasing, redeeming, or using a Source Hub key, you acknowledge and agree to comply with our [Terms of Service](https://sourcestore.mysellauth.com/terms-of-service), [Privacy Policy](https://sourcestore.mysellauth.com/privacy-policy) & [Provider policy](https://sourcestore.mysellauth.com/refund-policy)
`,
    color: 0xff0000,
    imageURL: 'https://image2url.com/r2/bucket1/images/1768073644313-919a180b-43d3-48dc-9ad6-5e8a40269d8d.gif'
  },

  links: {
    webstore: 'https://sourcestore.mysellauth.com/',
    support: 'https://discord.com/channels/1372910832392081420/1389852834194784391/1389853047815012455'
  },

  autoDeleteCommandMs: 5000,
  autoDeleteLoaderMs: 15000,
  usedKeysFile: './usedKeys.json'
};

/* ===============================
   ⚙️ CLIENT SETUP
   =============================== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Load used keys
let usedKeys = new Set();
if (fs.existsSync(CONFIG.usedKeysFile)) {
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG.usedKeysFile, 'utf8'));
    usedKeys = new Set(data);
  } catch {}
}

/* ===============================
   📩 COMMAND HANDLER
   =============================== */
client.on('messageCreate', async (message) => {
  if (message.content !== CONFIG.command) return;

  const embed = new EmbedBuilder()
    .setTitle(CONFIG.embed.title)
    .setDescription(CONFIG.embed.description)
    .setColor(CONFIG.embed.color)
    .setImage(CONFIG.embed.imageURL)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Web Store').setStyle(ButtonStyle.Link).setURL(CONFIG.links.webstore),
    new ButtonBuilder().setLabel('Support').setStyle(ButtonStyle.Link).setURL(CONFIG.links.support),
    new ButtonBuilder().setCustomId('get_role').setLabel('Get Role').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('get_loader').setLabel('Get Loader').setStyle(ButtonStyle.Primary)
  );

  await message.channel.send({ embeds: [embed], components: [row] });

  setTimeout(() => message.delete().catch(() => {}), CONFIG.autoDeleteCommandMs);
});

/* ===============================
   🔘 BUTTON HANDLER
   =============================== */
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const member = interaction.member;
  const hasRole = member.roles.cache.some(r => r.name === CONFIG.buyerRoleName);

  // GET ROLE
  if (interaction.customId === 'get_role') {
    if (hasRole) {
      return interaction.reply({ content: '❌ You already have the role.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId('redeem_key')
      .setTitle('Redeem Key');

    const input = new TextInputBuilder()
      .setCustomId('key')
      .setLabel('Enter your key from SourceHUB')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  // GET LOADER
  if (interaction.customId === 'get_loader') {
    if (!hasRole) {
      return interaction.reply({ content: '❌ You do not have .source role to access the loader.', ephemeral: true });
    }

    const loaderMsg = await interaction.reply({
      content: CONFIG.loaderMessage,
      ephemeral: true,
      fetchReply: true
    });

    setTimeout(() => {
      if (loaderMsg.deletable) loaderMsg.delete().catch(() => {});
    }, CONFIG.autoDeleteLoaderMs);
  }
});

/* ===============================
   🧾 MODAL SUBMIT HANDLER WITH LOGS
   =============================== */
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId !== 'redeem_key') return;

  const key = interaction.fields.getTextInputValue('key').trim();
  const logChannel = interaction.guild.channels.cache.get(CONFIG.logChannelId);

  // CHECK 36 LENGTH (BACKEND ONLY)
  if (key.length !== 36) {
    if (logChannel) logChannel.send(`<@${interaction.user.id}> entered invalid key length: \`${key}\``);
    return interaction.reply({
      content: '❌ Invalid key. Use your key from SourceHUB.',
      ephemeral: true
    });
  }

  // ANTI-REUSE
  if (usedKeys.has(key)) {
    if (logChannel) logChannel.send(`<@${interaction.user.id}> tried to reuse key: \`${key}\``);
    return interaction.reply({ content: '❌ This key has already been used.', ephemeral: true });
  }

  try {
    const role = interaction.guild.roles.cache.find(r => r.name === CONFIG.buyerRoleName);
    if (!role) {
      if (logChannel) logChannel.send(`<@${interaction.user.id}> attempted to redeem a key but role not found.`);
      return interaction.reply({ content: '❌ Role not found. Check role name.', ephemeral: true });
    }

    await interaction.member.roles.add(role);

    usedKeys.add(key);
    fs.writeFileSync(CONFIG.usedKeysFile, JSON.stringify([...usedKeys], null, 2));

    await interaction.reply({ content: '✅ Key verified! Role granted.', ephemeral: true });

    if (logChannel) {
      logChannel.send(`✅ <@${interaction.user.id}> redeemed key: \`${key}\` and received the role.`);
    }
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: '❌ Failed to set role. Try again later.', ephemeral: true });
    if (logChannel) {
      logChannel.send(`❌ <@${interaction.user.id}> failed to redeem key: \`${key}\` — Error: ${err.message}`);
    }
  }
});

/* ===============================
   🔑 LOGIN
   =============================== */
client.login(process.env.DISCORD_TOKEN);
