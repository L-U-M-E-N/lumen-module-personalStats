const calendarTypes = {
};

class PersonalStats {
	static PLAYING_BUTTON = '&#x25b7;';
	static PLAY_BUTTON = '&#9654;';
	static CURRENT_CATEGORY = 'Other';
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

		PersonalStats.switchCategory(PersonalStats.CURRENT_CATEGORY);

		PersonalStats.initBackgroundProcess();
	}

	static archiveStats() {
		const lastDate = new Date(parseInt(localStorage.lastLaunch)).toDateString();

		if(localStorage.lastLaunch === undefined || // Never used
			(new Date()).toDateString() !== lastDate) { // Another day

			let history = {};
			if(localStorage.history !== undefined) {
				history = JSON.parse(localStorage.history);
			}

			history[lastDate] = {};

			for(const type in {...PersonalStats.DEFAULT_CATEGORIES, ...calendarTypes }) {
				history[lastDate][type] = localStorage['PersonalStats_' + type];
				localStorage['PersonalStats_' + type] = 0;
			}

			localStorage.history = JSON.stringify(history);
		}

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
							PersonalStats.historyStats[type][duration] += (history[i][type] || 0);
						}
					}
				}
			}
		}

		clearInterval(PersonalStats.updateFiguresInterval);
		PersonalStats.updateFiguresInterval = setInterval(PersonalStats.updateFigures, 1000);
	}

	static switchCategory(newType) {
		PersonalStats.CURRENT_CATEGORY = newType;

		for(const elt of document.getElementsByClassName('module-personalStats-button')) {
			if(elt.getAttribute('category') === PersonalStats.CURRENT_CATEGORY) {
				elt.innerHTML = PersonalStats.PLAYING_BUTTON;
			} else {
				elt.innerHTML = PersonalStats.PLAY_BUTTON;
			}
		}
	}

	static updateFigures() {
		localStorage['PersonalStats_' + PersonalStats.CURRENT_CATEGORY] = parseInt(localStorage['PersonalStats_' + PersonalStats.CURRENT_CATEGORY] || 0) + 1;
		
		let totalTimes = {};
		const typeList = {...PersonalStats.DEFAULT_CATEGORIES, ...calendarTypes };
		for(const duration in PersonalStats.DURATIONS) {
			totalTimes[duration] = 0;

			for(const type in typeList) {
				if(typeList[type]) {
					totalTimes[duration] += PersonalStats.historyStats[type][duration]
							+ parseInt(localStorage['PersonalStats_' + type]);
				}
			}
		}

		for(const type in {...PersonalStats.DEFAULT_CATEGORIES, ...calendarTypes }) {
			for(const duration in PersonalStats.DURATIONS) {
				const currTypeVal = PersonalStats.historyStats[type][duration] + parseInt(localStorage['PersonalStats_' + type]);
				const ratioVal = Math.round(1000 * currTypeVal / totalTimes[duration])/10;

				document.getElementById('module-personalStats-' + type + '-' + duration + '-percentage').innerText = ratioVal + '%';
			}
		}
	}
}

window.addEventListener('load', PersonalStats.init);