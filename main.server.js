import fs from 'fs';
import { MessageActionRow, MessageButton } from 'discord.js';

export default class PersonalStats {
	static activitiesStart = {};

	static init() {
		const activities = JSON.parse(JSON.stringify(config.activities));
		activities['Sleep'] = true;

		for(const activity in activities) {
			if(!activities[activity]) {
				continue;
			}
			const lowerActivity = activity.toLowerCase();

			console.log(lowerActivity);

			Discord.registerCmd(
				lowerActivity,
				(c, i) => PersonalStats.startActivity(activity, c, i),
				{
					description: `Start ${activity} now !`,
				}
			);

			Discord.registerBtn(
				lowerActivity + '-restart',
				(c, i) => PersonalStats.restartActivity(activity, c, i),
			);

			Discord.registerBtn(
				lowerActivity + '-end',
				(c, i) => PersonalStats.endActivity(activity, c, i),
			);
		}
	}

	static close() {
	}

	static restartActivity(activity, discordClient, interaction) {
		PersonalStats.startActivity(activity, discordClient, interaction, true);
	}

	static startActivity(activity, discordClient, interaction, restarted = false) {
		const lowerActivity = activity.toLowerCase();

		const row = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId(lowerActivity + '-restart')
					.setLabel('Restart')
					.setStyle('DANGER'),
			)
			.addComponents(
				new MessageButton()
					.setCustomId(lowerActivity + '-end')
					.setLabel('End ' + activity)
					.setStyle('PRIMARY'),
			);

		PersonalStats.activitiesStart[activity] = new Date();

		const verb = restarted ? 'Restarted' : 'Started';

		interaction.reply({
			content: `${verb} at ${PersonalStats.activitiesStart[activity].toLocaleTimeString(config.locale)}`,
			components: [row],
			ephemeral: true
		})
	}

	static endActivity(activity, discordClient, interaction) {
		if(!PersonalStats.activitiesStart[activity]) {
			interaction.reply({
				content: `Error: you didn't start to ${activity} !`,
				ephemeral: true
			})
		}

		const activityEnd = new Date();

		const [query, values] = Database.buildInsertQuery('calendar', {
			id: `${activity.toUpperCase()}-${PersonalStats.activitiesStart[activity].toISOString()}`,
			title: activity,
			description: '',
			start: PersonalStats.activitiesStart[activity],
			end: activityEnd,
			origin: 'Lumen Discord Bot'
		});

		Database.execQuery(
			query,
			values
		);

		interaction.reply({
			content: `Did "${activity}" from ${PersonalStats.activitiesStart[activity].toLocaleTimeString(config.locale)} from ${activityEnd.toLocaleTimeString(config.locale)} !`,
			ephemeral: true
		});
		PersonalStats.activitiesStart[activity] = null;
	}
}
