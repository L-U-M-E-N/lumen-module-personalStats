import fs from 'fs';
import { MessageActionRow, MessageButton } from 'discord.js';

export default class PersonalStats {
	static sleepStart = null;

	static init() {
		Discord.registerCmd(
			'sleep',
			PersonalStats.startSleep,
			{
				description: 'Start sleeping now !',
			}
		);

		Discord.registerBtn(
			'sleep-restart',
			PersonalStats.restartSleep
		);

		Discord.registerBtn(
			'sleep-end',
			PersonalStats.endSleep
		);
	}

	static close() {
	}

	static restartSleep(discordClient, interaction) {
		PersonalStats.startSleep(discordClient, interaction, true);
	}

	static startSleep(discordClient, interaction, restarted = false) {
		const row = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId('sleep-restart')
					.setLabel('Restart')
					.setStyle('DANGER'),
			)
			.addComponents(
				new MessageButton()
					.setCustomId('sleep-end')
					.setLabel('End sleep')
					.setStyle('PRIMARY'),
			);

		PersonalStats.sleepStart = new Date();

		const verb = restarted ? 'Restarted' : 'Started';

		interaction.reply({
			content: `${verb} at ${PersonalStats.sleepStart.toLocaleTimeString(config.locale)}`,
			components: [row],
			ephemeral: true
		})
	}

	static endSleep(discordClient, interaction) {
		if(!PersonalStats.sleepStart) {
			interaction.reply({
				content: 'Error: you didn\'t start to sleep !',
				ephemeral: true
			})
		}

		const sleepEnd = new Date();

		const [query, values] = Database.buildInsertQuery('calendar', {
			id: `SLEEP-${PersonalStats.sleepStart.toISOString()}`,
			title: 'Sleep',
			description: '',
			start: PersonalStats.sleepStart,
			end: sleepEnd,
			origin: 'Lumen Discord Bot'
		});

		Database.execQuery(
			query,
			values
		);

		interaction.reply({
			content: `Slept from ${PersonalStats.sleepStart.toLocaleTimeString(config.locale)} from ${sleepEnd.toLocaleTimeString(config.locale)} !`,
			ephemeral: true
		});
		PersonalStats.sleepStart = null;
	}
}
