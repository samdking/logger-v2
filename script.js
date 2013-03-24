
function shortDateFormat(date) {
	var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	return date.getDate() + ' ' + monthNames[date.getMonth()];
}

var LoggerViewModel = function(data) {
	var self = this;
	this.info = ko.observable([
		'Last Updated: ' + data.last_updated,
		'Size: ' + data.file_size,
		'Load time: ' + data.response_time
	].join(' <span>|</span> '));
	this.user = ko.observable({
		initials: 'SK',
		id: 39,
		firstName: 'Sam',
		lastName: 'King'
	});
	this.query = ko.observable('');
	this.tickets = ko.observableArray([]);
	this.perPage = ko.observable(15);
	this.selectedTicket = ko.observable();
	data.tickets.map(function(data) {
		var ticket = new Ticket(data);
		self.tickets.push(ticket);
		if (data.uid == localStorage.openedTicket)
			this.selectedTicket(ticket);
	}, this);
	var storedDepts = JSON.parse(localStorage.getItem('filterDepartments'));

	this.departments = [
		new Department({uid: 3, name: 'Support', selected: storedDepts? storedDepts['Support'] : true}),
		new Department({uid: 1, name: 'Project', selected: storedDepts? storedDepts['Project'] : true}),
		new Department({uid: 2, name: 'SEO', selected: storedDepts? storedDepts['SEO'] : true}),
		new Department({uid: 4, name: 'Internal', selected: storedDepts? storedDepts['Internal'] : true})
	];

	this.filterDepartments = ko.computed(function() {
		return ko.utils.arrayFilter(self.departments, function(item) {
			return item.selected();
		});
	});

	this.filterDepartments.subscribe(function(items) {
		var obj = {};
		items.map(function(item) {
			obj[item.name] = true;
		});
		localStorage.filterDepartments = JSON.stringify(obj);
	});

	this.ticketCount = ko.observable(this.perPage());
	this.filteredTickets = ko.computed(function() {
		var perPage = self.perPage();
		var all = ko.utils.arrayFilter(self.tickets(), function(item) {
			return ko.utils.arrayFirst(self.filterDepartments(), function(dept) {
				return item.department_uid == dept.uid && item.summary && item.summary.toLowerCase().indexOf(self.query().toLowerCase()) > -1;
			});
		});
		self.ticketCount(all.length);
		return all.slice(0, perPage);
	});

	this.showMore = function() {
		self.perPage(self.perPage()+15);
		return false;
	};

	this.viewTicket = function(item) {
		if (self.selectedTicket() === item)
			item = null;
		self.selectedTicket(item);
		localStorage.openedTicket = item? item.uid : null;
	};

	this.scheduledTasks = ko.computed(function() {
		return ko.utils.arrayFilter(self.tickets(), function(item) {
			return item.loggedToday();
		});
	});
};

var Ticket = function(data) {

	this.taskTypes = ko.observableArray(['Meeting']);
	this.timing = ko.observable(false);
	for(var i in data)
		this[i] = data[i];
	this.tasks = ko.observableArray(data.tasks? data.tasks.map(function(task) {
		return new Task(task);
	}) : []);
	this.taskCount = ko.computed(function() {
		return '(' + this.tasks().length + ')';
	}, this);
	this.last_time_i_logged = ko.observable(data.last_time_i_logged);
	this.timeAgo = function() {
		if (!this.last_time_i_logged)
			return null;
		var dateLogged = new Date(this.last_time_i_logged());
		var days = Math.round((new Date() - dateLogged)/1000/60/60/24);
		return days + ' day' + (days === 1? '' : 's');
	};
	var self = this;
	this.loggedToday = ko.computed(function() {
		return parseInt(self.timeAgo(), 10) <= 3;
	});
	this.newTask = ko.observable();
	this.saveTask = function(data) {
		self.newTask().save(data);
		self.tasks.unshift(self.newTask());
		self.last_time_i_logged(self.newTask().datetime);
		self.newTask(null);
	};
	this.createTask = function() {
		this.newTask(new Task({datetime: new Date()}));
	};
	this.cancel = function() {
		self.newTask(null);
	};
	this.people = function() {
		return data.people? data.people.split(', ') : [];
	};
};

var Task = function(data)
{
	for(var i in data)
		this[i] = data[i];
	this.datetime = new Date(data.datetime);
	this.description = ko.observable(data.description);
	this.duration = ko.observable(data.duration || 0);
	this.save = function(data) {
		console.log('Writing ' + this.description());
	};
	this.date = function() {
		return shortDateFormat(this.datetime);
	};
};

var Department = function(data)
{
	var self = this;
	this.uid = data.uid;
	this.name = data.name;
	this.selected = ko.observable(data.selected);
};

var startTime = new Date();

$.getJSON('json.php', function(response, status, jqXHR) {
	response.response_time = (new Date() - startTime) / 1000 + 's';
	response.file_size = Math.round(jqXHR.responseText.length/1024) + 'k';
	ko.applyBindings(new LoggerViewModel(response));
});
