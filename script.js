
var LoggerViewModel = function(data) {
	var self = this;
	this.initials = 'SK';
	this.setupDefaultDepartments = function(depts) {
		var arr = depts.map(function(item) {
			var key = item.name;
			return { key: true};
		});
		localStorage.setItem('filterDepartments', JSON.stringify(arr));
	};
	this.query = ko.observable('');
	this.tickets = ko.observableArray([]);
	this.perPage = ko.observable(15);
	this.selectedTicket = ko.observable();
	data.tickets.map(function(data) {
		self.tickets.push(new Ticket(data));
	});
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
				return item.department_uid == dept.uid && item.summary.toLowerCase().indexOf(self.query().toLowerCase()) > -1;
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
		self.selectedTicket(item);
	};
};

var Ticket = function(data) {
	for(var i in data)
		this[i] = data[i];
	this.timeAgo = function() {
		if (!this.last_time_i_logged)
			return null;
		var dateLogged = new Date(this.last_time_i_logged);
		var days = Math.round((new Date() - dateLogged)/1000/60/60/24);
		return days + ' day' + (days === 1? '' : 's');
	};
	this.tasks = ko.observableArray(data.tasks || []);
	this.taskCount = ko.computed(function() {
		return '(' + this.tasks().length + ')';
	}, this);
	this.people = function() {
		return data.people.split(', ');
	};
	this.loggedToday = ko.observable(parseInt(this.timeAgo(), 10) <= 1);
};

var Department = function(data)
{
	var self = this;
	this.uid = data.uid;
	this.name = data.name;
	this.selected = ko.observable(data.selected);
};

$.getJSON('json.php', function(response) {
	ko.applyBindings(new LoggerViewModel(response));
});
