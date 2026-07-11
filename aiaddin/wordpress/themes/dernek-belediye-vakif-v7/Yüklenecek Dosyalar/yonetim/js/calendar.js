$(document).ready(function(){
	var calendar = $('#calendar').fullCalendar({
		monthNames: ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'],
        monthNamesShort: ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'],
        dayNames: ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'],
        dayNamesShort: ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'],
        editable:true,
        buttonText: {
                today:    'Bugün',
                month:    'Ay',
                week:     'Hafta',
                day:      'Gün',
                list:     'Liste',
                listMonth: 'Aylık Liste',
                listYear: 'Yıllık Liste',
                listWeek: 'Haftalık Liste',
                listDay: 'Günlük Liste'
        },
		header:{
		   left: 'prev,next today',
			center: 'title',
			right: 'month,basicWeek,basicDay'
		},
		editable: true,
		selectable: true,
		allDaySlot: false,
		navLinks: true, // can click day/week names to navigate views
		eventLimit: true, // allow "more" link when too many events
		
		events: [{
			title: 'All Day Event',
			start: '2019-01-01'
		  },
		  {
			title: 'Long Event',
			start: '2019-08-01',
			end: '2019-08-08'
		  },
		  {
			id: 999,
			title: 'Repeating Event',
			start: '2019-01-01T16:00:00'
		  },
		  {
			id: 999,
			title: 'Repeating Event',
			start: '2017-07-16T16:00:00'
		  },
		  {
			title: 'Conference',
			start: '2017-07-11',
			end: '2017-07-13'
		  },
		  {
			title: 'Meeting',
			start: '2017-07-12T10:30:00',
			end: '2017-07-12T12:30:00'
		  },
		  {
			title: 'Lunch',
			start: '2017-07-12T12:00:00'
		  },
		  {
			title: 'Meeting',
			start: '2017-07-12T14:30:00'
		  },
		  {
			title: 'Happy Hour',
			start: '2017-07-12T17:30:00'
		  },
		  {
			title: 'Dinner',
			start: '2017-07-12T20:00:00'
		  },
		  {
			title: 'Birthday Party',
			start: '2017-07-13T07:00:00'
		  },
		  {
			title: 'Click for Google',
			url: 'http://google.com/',
			start: '2017-07-28'
		  }
		],

		
		eventClick:  function(event, jsEvent, view) {
			endtime = $.fullCalendar.moment(event.end).format('h:mm');
			starttime = $.fullCalendar.moment(event.start).format('dddd, MMMM Do YYYY, h:mm');
			var mywhen = starttime + ' - ' + endtime;
			$('#modalTitle').html(event.title);
			$('#modalWhen').text(mywhen);
			$('#eventID').val(event.id);
			$('#calendarModal').modal();
		},
		
		//header and other values
		select: function(start, end, jsEvent) {
			endtime = $.fullCalendar.moment(end).format('h:mm');
			starttime = $.fullCalendar.moment(start).format('dddd, MMMM Do YYYY, h:mm');
			var mywhen = starttime + ' - ' + endtime;
			start = moment(start).format();
			end = moment(end).format();
			$('#createEventModal #startTime').val(start);
			$('#createEventModal #endTime').val(end);
			$('#createEventModal #when').text(mywhen);
			$('#createEventModal').modal('toggle');
	   },
	   eventDrop: function(event, delta){
		   $.ajax({
			   url: 'index.php?sayfa=not-defteri',
			   data: 'action=update&title='+event.title+'&start='+moment(event.start).format()+'&end='+moment(event.end).format()+'&id='+event.id ,
			   type: "POST",
			   success: function(json) {
			   //alert(json);
			   }
		   });
	   },
	   eventResize: function(event) {
		   $.ajax({
			   url: 'index.php?sayfa=not-defteri',
			   data: 'action=update&title='+event.title+'&start='+moment(event.start).format()+'&end='+moment(event.end).format()+'&id='+event.id,
			   type: "POST",
			   success: function(json) {
				   //alert(json);
			   }
		   });
	   }
	});
		   
   $('#submitButton').on('click', function(e){
	   // We don't want this to act as a link so cancel the link action
	   e.preventDefault();
	   doSubmit();
   });
   
   $('#deleteButton').on('click', function(e){
	   // We don't want this to act as a link so cancel the link action
	   e.preventDefault();
	   doDelete();
   });
   
   function doDelete(){
	   $("#calendarModal").modal('hide');
	   var eventID = $('#eventID').val();
	   $.ajax({
		   url: 'index.php?sayfa=not-defteri',
		   data: 'action=delete&id='+eventID,
		   type: "POST",
		   success: function(json) {
			   if(json == 1)
					$("#calendar").fullCalendar('removeEvents',eventID);
			   else
					return false;
				
			   
		   }
	   });
   }
   function doSubmit(){
	   $("#createEventModal").modal('hide');
	   var title = $('#title').val();
	   var startTime = $('#startTime').val();
	   var endTime = $('#endTime').val();
	   
	   $.ajax({
		   url: 'index.php?sayfa=not-defteri',
		   data: 'action=add&title='+title+'&start='+startTime+'&end='+endTime,
		   type: "POST",
		   success: function(json) {
			   $("#calendar").fullCalendar('renderEvent',
			   {
				   id: json.id,
				   title: title,
				   start: startTime,
				   end: endTime,
			   },
			   true);
		   }
	   });
	   
   }
});