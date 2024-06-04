# Telegram Poll Bot

This is a Telegram bot for creating and managing polls. It allows admins to create, update, and delete polls, as well as manage required channels for voting. Users can vote on polls after subscribing to the required channels.

## Features

- Create, update, and delete polls
- Add, remove, and list required channels
- Vote on polls after subscribing to required channels
- Change vote if desired

## Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/your-repo/telegram-poll-bot.git
   ```

2. Navigate to the project directory:

   ```bash
   cd telegram-poll-bot
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Create a `.env` file and add your bot token, MongoDB connection string, and admin chat ID:

   ```env
   BOT_TOKEN=your_bot_token
   MONGODB_URI=your_mongodb_connection_string
   ADMIN_CHAT_ID=your_telegram_chat_id
   ```

5. Start the bot:
   ```bash
   npm start
   ```

## Usage

- `/createpoll <title>` - Create a new poll with the given title
- `/addoption <poll_id> <option_text>` - Add an option to the specified poll
- `/deletepoll <poll_id>` - Delete the specified poll
- `/addchannel <channel_id> <channel_name>` - Add a required channel
- `/removechannel <channel_id>` - Remove a required channel
- `/listchannels` - List all required channels
- `/vote <poll_id> <option_index>` - Vote for an option in the specified poll
- `/publishpoll <poll_id>` - Publish a poll with inline buttons and a share button

## License

This project is licensed under the MIT License.
