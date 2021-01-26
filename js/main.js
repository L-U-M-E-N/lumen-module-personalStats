const calendarTypes = {
};

class PersonalStats {
	static PLAYING_BUTTON = '&#x25b7;';
	static PLAY_BUTTON = '&#9654;';
	static DEFAULT_CURRENT_CATEGORY = 'Other';
	static CURRENT_CATEGORY = '';
	static MINOR_CATEGORIES = [];
	static DEFAULT_CATEGORIES = {...calendarTypes, 'Other': true };
	static DURATIONS = { 'Day': 1, 'Week': 7, 'Month': 30 };

	static init() {
		const table = document.getElementById('module-personalStats-tbody');

		// Clean table
		while(table.firstChild) {
			table.removeChild(table.firstChild);
		}

		// Write table
		for(const type in {...PersonalStats.DEFAULT_CATEGORIES, ...calendarTypes }) {
			const tr = document.createElement('tr');

			const tdName = document.createElement('td');
			tdName.innerText = type;
			tr.appendChild(tdName);

			const tdButton = document.createElement('td');
			tdButton.classList = 'module-personalStats-button';
			tdButton.setAttribute('category', type);
			tdButton.addEventListener('click', () => {
				PersonalStats.switchCategory(type);
			});
			tr.appendChild(tdButton);

			for(const duration in PersonalStats.DURATIONS) {
				const td = document.createElement('td');
				td.id = 'module-personalStats-' + type + '-' + duration + '-percentage';
				td.innerText = '?%';

				tr.appendChild(td);
			}

			table.appendChild(tr);
		}

		PersonalStats.switchCategory(PersonalStats.DEFAULT_CURRENT_CATEGORY);

		PersonalStats.initBackgroundProcess();
	}

	static archiveStats() {
		const lastDate = new Date(parseInt(localStorage.lastLaunch)).toDateString();

		let history = {};
		if(localStorage.history !== undefined) {
			history = JSON.parse(localStorage.history);
		}

		if(localStorage.lastLaunch !== undefined && // Never used
			(new Date()).toDateString() !== lastDate) { // Another day

			history[lastDate] = {};

			for(const type in {...PersonalStats.DEFAULT_CATEGORIES, ...calendarTypes }) {
				history[lastDate][type] = localStorage['PersonalStats_' + type];
				localStorage['PersonalStats_' + type] = 0;
			}
		}

		localStorage.history = JSON.stringify(history);
		localStorage.lastLaunch = Date.now();
	}

	static initBackgroundProcess() {
		PersonalStats.archiveStats();

		// Initialize stats
		PersonalStats.historyStats = {};
		const durationPeriods = {};
		for(const type in {...PersonalStats.DEFAULT_CATEGORIES, ...calendarTypes }) {
			PersonalStats.historyStats[type] = {};

			for(const duration in PersonalStats.DURATIONS) {
				PersonalStats.historyStats[type][duration] = parseInt(localStorage['PersonalStats_' + type] || 0);

				durationPeriods[duration] = new Date();
				durationPeriods[duration].setDate(durationPeriods[duration].getDate() - (PersonalStats.DURATIONS[duration] - 1)); // Duration must be -1 because we use midnight as basis of calculation
				durationPeriods[duration].setHours(0, 0, 0, 0);
			}
		}

		if(localStorage.history !== undefined) {
			const history = JSON.parse(localStorage.history);

			for(const i in history) {
				for(const duration in PersonalStats.DURATIONS) {
					if(new Date(i).getTime() >= durationPeriods[duration].getTime()) {
						for(const type in {...PersonalStats.DEFAULT_CATEGORIES, ...calendarTypes }) {
							PersonalStats.historyStats[type][duration] += parseInt((history[i][type] || 0));
						}
					}
				}
			}
		}

		clearInterval(PersonalStats.updateFiguresInterval);
		PersonalStats.updateFiguresInterval = setInterval(PersonalStats.updateFigures, 1000);
	}

	static switchCategory(newType) {
		const typeList = {...PersonalStats.DEFAULT_CATEGORIES, ...calendarTypes };

		// Desactivate current "major" activity
		if(PersonalStats.CURRENT_CATEGORY === newType) {
			PersonalStats.CURRENT_CATEGORY = '';
		} else {
			// Activate current "major" activity
			if(typeList[newType]) {
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

	static updateFigures() {
		// Increment for major activity
		if(PersonalStats.CURRENT_CATEGORY !== '') {
			localStorage['PersonalStats_' + PersonalStats.CURRENT_CATEGORY] = parseInt(localStorage['PersonalStats_' + PersonalStats.CURRENT_CATEGORY] || 0) + 1;
		}

		// Increment for minor activities
		for(const activity of PersonalStats.MINOR_CATEGORIES) {
			localStorage['PersonalStats_' + activity] = parseInt(localStorage['PersonalStats_' + activity] || 0) + 1;
		}

		// Compute total times
		let totalTimes = {};
		const typeList = {...PersonalStats.DEFAULT_CATEGORIES, ...calendarTypes };
		for(const duration in PersonalStats.DURATIONS) {
			totalTimes[duration] = 0;

			for(const type in typeList) {
				if(typeList[type]) {
					if(PersonalStats.historyStats[type] && PersonalStats.historyStats[type][duration]) {
						totalTimes[duration] += PersonalStats.historyStats[type][duration];
					}

					if(localStorage['PersonalStats_' + type]) {
						totalTimes[duration] += parseInt(localStorage['PersonalStats_' + type]);
					}
				}
			}
		}

		for(const type in {...PersonalStats.DEFAULT_CATEGORIES, ...calendarTypes }) {
			for(const duration in PersonalStats.DURATIONS) {
				const currTypeVal = PersonalStats.historyStats[type][duration] + parseInt(localStorage['PersonalStats_' + type]);
				let ratioVal = Math.round(1000 * currTypeVal / totalTimes[duration])/10;

				if(Number.isNaN(ratioVal)) {
					ratioVal = 0;
				}

				document.getElementById('module-personalStats-' + type + '-' + duration + '-percentage').innerText = ratioVal + '%';
			}
		}
	}
}

window.addEventListener('load', PersonalStats.init);