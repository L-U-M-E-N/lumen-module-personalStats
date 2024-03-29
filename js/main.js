let localData = {};

class PersonalStats {
	static PLAYING_BUTTON = '&#x25b7;';
	static PLAY_BUTTON = '&#9654;';
	static DEFAULT_CURRENT_CATEGORY = 'Other';
	static CURRENT_CATEGORY = '';
	static MINOR_CATEGORIES = [];
	static DEFAULT_CATEGORIES = { 'Other': true };
	static DURATIONS = { 'Day': 1, 'Week': 7, 'Month': 30 };

	static async getActivitiesList() {
		return {
			...PersonalStats.DEFAULT_CATEGORIES, 
			...(await ConfigManager.get('personalStats', 'activities'))
		};
	}

	static async init() {
		const table = document.getElementById('module-personalStats-tbody');

		if(await AppDataManager.exists('personalStats', 'localData')) {
			localData = await AppDataManager.loadObject('personalStats', 'localData');
		}

		// Clean table
		while(table.firstChild) {
			table.removeChild(table.firstChild);
		}

		// Write table
		const typesList = await PersonalStats.getActivitiesList();
		for(const type in typesList) {
			const trFirstLine = document.createElement('tr');
			const trSecondLine = document.createElement('tr');

			const tdName = document.createElement('td');
			tdName.innerText = type;
			tdName.setAttribute('rowspan', 2);
			tdName.style.fontWeight = typesList[type] ? 'bold' : '';
			trFirstLine.appendChild(tdName);

			const tdButton = document.createElement('td');
			tdButton.classList = 'module-personalStats-button';
			tdButton.setAttribute('category', type);
			tdButton.setAttribute('rowspan', 2);
			tdButton.addEventListener('click', () => PersonalStats.switchCategory(type));
			trFirstLine.appendChild(tdButton);

			for(const duration in PersonalStats.DURATIONS) {
				const tdPercentage = document.createElement('td');
				tdPercentage.id = 'module-personalStats-' + type + '-' + duration + '-percentage';
				tdPercentage.innerText = '?%';

				trFirstLine.appendChild(tdPercentage);

				const tdTime = document.createElement('td');
				tdTime.id = 'module-personalStats-' + type + '-' + duration + '-time';
				tdTime.innerText = '??:??:??';

				trSecondLine.appendChild(tdTime);
			}

			table.appendChild(trFirstLine);
			table.appendChild(trSecondLine);

			const emptyLine = document.createElement('tr');
			const emptyCell = document.createElement('td');
			emptyCell.setAttribute('colspan', 5);
			emptyCell.innerHTML = '&nbsp;'
			emptyLine.appendChild(emptyCell);
			table.appendChild(emptyLine);
		}

		await PersonalStats.switchCategory(PersonalStats.DEFAULT_CURRENT_CATEGORY);

		await PersonalStats.initBackgroundProcess();
	}

	static async archiveStats() {
		const lastDate = new Date(localData.lastLaunch).toDateString();

		if(localData.history === undefined) {
			localData.history = {};
		}

		if(localData.lastLaunch !== undefined && // Never used
			(new Date()).toDateString() !== lastDate) { // Another day

			localData.history[lastDate] = {};

			for(const type in await PersonalStats.getActivitiesList()) {
				localData.history[lastDate][type] = localData['PersonalStats_' + type];
				localData['PersonalStats_' + type] = 0;
			}
		}

		localData.lastLaunch = Date.now();

		await AppDataManager.saveObject('personalStats', 'localData', localData);
	}

	static async initBackgroundProcess() {
		await PersonalStats.archiveStats();

		const typesList = await PersonalStats.getActivitiesList();

		// Initialize stats
		PersonalStats.historyStats = {};
		const durationPeriods = {};
		for(const type in typesList) {
			PersonalStats.historyStats[type] = {};

			for(const duration in PersonalStats.DURATIONS) {
				PersonalStats.historyStats[type][duration] = 0;

				durationPeriods[duration] = new Date();
				durationPeriods[duration].setDate(durationPeriods[duration].getDate() - (PersonalStats.DURATIONS[duration] - 1)); // Duration must be -1 because we use midnight as basis of calculation
				durationPeriods[duration].setHours(0, 0, 0, 0);
			}
		}

		if(localData.history !== undefined) {
			for(const i in localData.history) {
				for(const duration in PersonalStats.DURATIONS) {
					if(new Date(i).getTime() >= durationPeriods[duration].getTime()) {
						for(const type in typesList) {
							PersonalStats.historyStats[type][duration] += (parseInt(localData.history[i][type], 10) || 0);
						}
					}
				}
			}
		}

		clearInterval(PersonalStats.updateFiguresInterval);
		PersonalStats.updateFiguresInterval = setInterval(PersonalStats.updateFigures, 1000);
	}

	static async switchCategory(newType) {
		const typesList = await PersonalStats.getActivitiesList();

		// Desactivate current "major" activity
		if(PersonalStats.CURRENT_CATEGORY === newType) {
			PersonalStats.CURRENT_CATEGORY = '';
		} else {
			// Activate current "major" activity
			if(typesList[newType]) {
				PersonalStats.CURRENT_CATEGORY = newType;
			} else {
				if(PersonalStats.MINOR_CATEGORIES.includes(newType)) {
					// Desactivate "minor" activity
					PersonalStats.MINOR_CATEGORIES = PersonalStats.MINOR_CATEGORIES.filter((elt) => elt !== newType);
				} else {
					// Activate "minor" activity
					PersonalStats.MINOR_CATEGORIES.push(newType);
				}
			}
		}

		// Display buttons
		for(const elt of document.getElementsByClassName('module-personalStats-button')) {
			const category = elt.getAttribute('category');
			if(category === PersonalStats.CURRENT_CATEGORY || PersonalStats.MINOR_CATEGORIES.includes(category)) {
				elt.innerHTML = PersonalStats.PLAYING_BUTTON;
			} else {
				elt.innerHTML = PersonalStats.PLAY_BUTTON;
			}
		}
	}

	static formatTime(duration) {
		return Math.floor(duration / 3600).toString().padStart(2, '0') + ':' + Math.floor((duration%3600) / 60).toString().padStart(2, '0') + ':' + (duration%60).toString().padStart(2, '0');
	}

	static logEveryHistory(type) {
		let acc = {};

		for(let date = (new Date('2018-01-01')).getTime(); date < Date.now(); date += 24 * 60 * 60 * 1000) {
			const strDate = (new Date(date)).toDateString();

			const activities = localData.history[strDate];
			if(activities && activities[type]) {
				console.log(strDate, PersonalStats.formatTime(activities[type]));
			}
		}
	}

	static async updateFigures() {
		const typesList = await PersonalStats.getActivitiesList();

		// Increment for major activity
		if(PersonalStats.CURRENT_CATEGORY !== '') {
			localData['PersonalStats_' + PersonalStats.CURRENT_CATEGORY] = (localData['PersonalStats_' + PersonalStats.CURRENT_CATEGORY] || 0) + 1;
		}

		// Increment for minor activities
		for(const activity of PersonalStats.MINOR_CATEGORIES) {
			localData['PersonalStats_' + activity] = (localData['PersonalStats_' + activity] || 0) + 1;
		}

		// Compute total times
		let totalTimes = {};
		for(const duration in PersonalStats.DURATIONS) {
			totalTimes[duration] = 0;

			for(const type in typesList) {
				if(typesList[type]) {
					if(PersonalStats.historyStats[type] && PersonalStats.historyStats[type][duration]) {
						totalTimes[duration] += PersonalStats.historyStats[type][duration];
					}

					if(localData['PersonalStats_' + type]) {
						totalTimes[duration] += localData['PersonalStats_' + type];
					}
				}
			}
		}

		for(const type in typesList) {
			for(const duration in PersonalStats.DURATIONS) {
				let currTypeVal = PersonalStats.historyStats[type][duration] + localData['PersonalStats_' + type];
				if(Number.isNaN(currTypeVal)) {
					currTypeVal = PersonalStats.historyStats[type][duration] || 0;
				}

				let ratioVal = Math.round(1000 * currTypeVal / totalTimes[duration])/10;
				if(Number.isNaN(ratioVal)) {
					ratioVal = 0;
				}

				document.getElementById('module-personalStats-' + type + '-' + duration + '-percentage').innerText = typesList[type] ? ratioVal + '%' : '';
				document.getElementById('module-personalStats-' + type + '-' + duration + '-time').innerText = PersonalStats.formatTime(currTypeVal);
			}
		}

		if((new Date()).getSeconds() === 0) {
			await AppDataManager.saveObject('personalStats', 'localData', localData);
		}
	}
}

window.addEventListener('load', PersonalStats.init);