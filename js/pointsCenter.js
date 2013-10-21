define(['jquery','nprogress','moment','hogan','add2home','stayInWebApp','bootstrap-daterangepicker','bootstrap-multiselect'],function ($,NProgress,moment,Hogan) {
	'use strict';
	var slivkans, nicknames, fellows, type = 'Other', valid_event_name = false, quarter_start, quarter_end;

	//add indexOfKey (useful: http://jsperf.com/js-for-loop-vs-array-indexof)
	Array.prototype.indexOfKey = function (key, value) {
		for(var i=0; i < this.length; i++){
			if(this[i][key] === value){
				return i;
			}
		}

		return -1;
	};

	//mobile app support
	$.stayInWebApp();

	//bind ajax start and stop to nprogress
	NProgress.configure({
		trickleRate: 0.1
	});
	$(document).on('ajaxStart', NProgress.start);
	$(document).on('ajaxStop', NProgress.done);

	//functions used by multiple pages
	var common = {
		updateValidity: function (element,valid){
			if (valid){
				element.addClass('has-success').removeClass('has-error');
			}else{
				element.removeClass('has-success').addClass('has-error');
			}
		},
		typeaheadOpts: function (name, slivkans) {
			return {
				name: name,
				valueKey: 'full_name',
				local: slivkans,
				template: ['<div class="slivkan-suggestion{{#dupe}} slivkan-dupe{{/dupe}}">{{full_name}}',
				'{{#photo}}<img src="img/slivkans/{{photo}}.jpg" />{{/photo}}</div>'].join(''),
				engine: Hogan
			};
		}
	},

	breakdown = {
		init: function () {
			//nav
			$('.nav li').eq(0).addClass('active');

			//Remove stale values of start and end
			if(localStorage.spc_brk_start && localStorage.spc_brk_start.search(/\//) !== -1){
				localStorage.spc_brk_start = '';
			}
			if(localStorage.spc_brk_end && localStorage.spc_brk_end.search(/\//) !== -1){
				localStorage.spc_brk_end = '';
			}

			$.ajax({
				async: true,
				dataType: 'json',
				url: 'ajax/getSlivkans.php',
				success: function (data) {
					slivkans = data.slivkans;
					quarter_start = data.quarter_info.start_date;
					quarter_end = data.quarter_info.end_date;

					for(var i=0; i<slivkans.length; i++){
						$('<option />').attr('value',slivkans[i].nu_email).text(slivkans[i].full_name).appendTo('#slivkan');
					}

					if(localStorage.spc_brk_slivkan){
						$('#slivkan').val(localStorage.spc_brk_slivkan);
						breakdown.getSlivkanPoints();
					}

					if(!localStorage.spc_brk_showUnattended){ $('#showUnattended').click(); }

					$('#daterange').daterangepicker({
						format: 'MMM Do',
						startDate: moment(localStorage.spc_brk_start || quarter_start),
						endDate: moment(localStorage.spc_brk_end || quarter_end),
						minDate: moment(quarter_start),
						maxDate: moment(quarter_end),
						ranges: {
							'Last 7 Days': [moment().subtract('days', 6), moment()],
							'Last 30 Days': [moment().subtract('days', 29), moment()],
							'Since Quarter Started': [moment(quarter_start), moment(quarter_end)]
						},
						buttonClasses: 'btn',
						applyClass: 'btn-primary'
					},function(start, end) {
						localStorage.spc_brk_start = start.format('YYYY-MM-DD');
						localStorage.spc_brk_end = end.format('YYYY-MM-DD');

						if($('#slivkan').val().length > 0){
							breakdown.getSlivkanPoints();
						}
					}).val(moment(localStorage.spc_brk_start || quarter_start).format('MMM Do') + ' - ' + moment(localStorage.spc_brk_end || quarter_end).format('MMM Do'));
				}
			});

			$('#slivkan')		.on('change', breakdown.getSlivkanPoints);
			$('.make-switch')	.on('switch-change', breakdown.toggleShowUnattended);
		},
		toggleShowUnattended: function(event,data){
			if(data.value){
				$('#unattended-col').slideDown();
				localStorage.spc_brk_showUnattended = 1;
			}else{
				$('#unattended-col').slideUp();
				localStorage.spc_brk_showUnattended = '';
			}
		},
		getSlivkanPoints: function(){
			var nu_email = $('#slivkan').val(),
			start = localStorage.spc_brk_start || quarter_start,
			end = localStorage.spc_brk_end || quarter_end;

			if(nu_email.length > 0){
				localStorage.spc_brk_slivkan = $('#slivkan').val();

				$('.slivkan-submit').html($('#slivkan option:selected').html());

				$('#breakdown').fadeOut(function(){
					$('#attended').empty();
					$('#attendedByCommittee').empty();
					$('#unattended').empty();
					$('#unattendedByCommittee').empty();

					$.ajax({
						async: true,
						dataType: 'json',
						url: 'ajax/getPointsBreakdown.php',
						data: {nu_email: nu_email, start: start, end: end},
						success: function(data){
							var events = data.attended.events, tableData, c;

							if(events.length > 0){
								for(var i=events.length-1; 0<=i; i--){
									$('<tr />').addClass(events[i].committee).appendTo('#attended');
									$('<td />').html(events[i].event_name).appendTo('#attended tr:last');
								}

								$('#attendedByCommittee').css('height','250px');
								tableData = [];
								for(c in data.attended.committees){
									if(data.attended.committees.hasOwnProperty(c)){
										tableData.push([c,data.attended.committees[c]]);
									}
								}

								breakdown.drawChart(tableData,'Attended Events Committee Distribution','attendedByCommittee');
							}else{
								$('<tr />').appendTo('#attended');
								$('<td />').html('None :(').appendTo('#attended tr:last');

								$('#attendedByCommittee').css('height','0');
							}

							events = data.unattended.events;
							if(events.length > 0){
								for(var j=events.length-1; 0<=j; j--){
									$('<tr />').addClass(events[j].committee).appendTo('#unattended');
									$('<td />').html(events[j].event_name).appendTo('#unattended tr:last');
								}

								$('#unattendedByCommittee').css('height','250px');
								tableData = [];
								for(c in data.unattended.committees){
									if(data.unattended.committees.hasOwnProperty(c)){
										tableData.push([c,data.unattended.committees[c]]);
									}
								}
								breakdown.drawChart(tableData,'Unattended Events Committee Distribution','unattendedByCommittee');
							}else{
								$('<tr />').appendTo('#unattended');
								$('<td />').html('None :D').appendTo('#unattended tr:last');

								$('#unattendedByCommittee').css('height','0');
							}

							$('#breakdown').fadeIn();
						}
					});
				});
			}
		},
		drawChart: function(tableData,title_in,id){
			setTimeout(function(){
				$('#'+id).highcharts({
					credits: {
						enabled: false
					},
					title: {
						text: title_in,
						style: {
							'font-size': '8pt'
						}
					},
					tooltip: {
						pointFormat: '{series.name}: {point.y}, <b>{point.percentage:.1f}%</b>'
					},
					series: [{
						type: 'pie',
						name: 'Events',
						data: tableData
					}]
				});
			},500);
		}
	},

	table = {
		init: function(){
			//nav
			$('.nav li').eq(1).addClass('active');

			var aDataSet = [],
			event_names = [],
			event_dates = [],
			event_targets = [],
			totals_targets = [],
			events, columns,

			nameColWidth = 140,
			eventColWidth = 16,
			totalsColWidth = 20;

			$.ajax({
				async: true,
				dataType: 'json',
				url: 'ajax/getPointsTable.php',
				success: function(data){
					events = data.events;

					for(var row in data.points_table){
						if(data.points_table.hasOwnProperty(row)){
							aDataSet.push(data.points_table[row]);
						}
					}

					for(var i=0; i<events.length; i++){
						var en = events[i].event_name,
						name = en.substr(0,en.length-11),
						date = en.substr(en.length-5);

						event_targets.push(i+2);

						event_names.push(name);
						event_dates.push(date);
					}

					var first_totals_target = data.events.length+2;

					for(i=0; i<6; i++){
						totals_targets.push(first_totals_target + i);
					}

					var oTable = $('#table').dataTable({
						aaData: aDataSet,
						aoColumnDefs: [
						{ aTargets: [0], sTitle: 'Name', sWidth: nameColWidth+'px', sClass: 'name'},
						{ aTargets: [1], bVisible: false },
						{ aTargets: event_targets, sWidth: eventColWidth+'px', fnCreatedCell: function(nTd, sData){
							if(sData == '1'){$(nTd).addClass('green');}
							else if(sData == '1.1' || sData == '0.1'){$(nTd).addClass('gold'); $(nTd).html($(nTd).html().substr(0,1));}
							else if(sData == '1.2' || sData == '0.2'){$(nTd).addClass('blue'); $(nTd).html($(nTd).html().substr(0,1));}
						}},
						{ aTargets: event_targets.concat(totals_targets), sTitle: '', asSorting: ['desc','asc']},
						{ aTargets: totals_targets, sClass: 'totals', sWidth: totalsColWidth+'px'}
						],
						bPaginate: false,
						bAutoWidth: false,
						oLanguage: {
							sSearch: 'Name:<br/>'
						},
						sDom: ['',
							'<"row table-controls"',
								'<"col-md-4 table-info"i>',
								'<"col-md-8"',
									'<"filter"f>',
									'<"filter filter1">',
									'<"filter filter2">',
									'<"filter filter3">',
									//'<"filter filter4">',
								'>',
							'><"header-row">',
							'<"row"<"col-lg-12"rt>>'].join('')
					});

					//table info
					$('#table_info').wrap('<div class="alert alert-info" />');
					$('<div />').text('Hover over names for info, click arrows to sort.').prependTo('.alert-info');
					$(['',
						'<table id="legend" class="legend"><tr class="odd">',
							'<td style="background-color: white;">Colors: </td>',
							'<td class="green">Point</td>',
							'<td class="blue">Committee</td>',
							'<td class="gold">Helper</td>',
							'<td style="background-color: #FF8F8F;">None</td>',
						'</tr></table>'].join('')).appendTo('.table-info');

					//name filter
					$('#table_filter input').addClass('form-control');

					$(['',
						'<label>Gender:<br/><select class="form-control" id="gender-filter">',
							'<option value="">All</option>',
							'<option value="m">Male</option>',
							'<option value="f">Female</option>',
						'</select></label>'].join('')).appendTo('.filter1');

					$(['',
						'<label>IMs:<br/><select class="form-control" id="im-filter">',
							'<option value="0">All</option>',
							'<option value="1">No IMs</option>',
							'<option value="2">Only IMs</option>',
						'</select></label>'].join('')).appendTo('.filter2');

					$(['',
						'<label>Committee:<br/><select class="multiselect" multiple="multiple" id="committee-filter">',
							'<option selected>Exec</option>',
							'<option selected>Academic</option>',
							'<option selected>Facilities</option>',
							'<option selected>Faculty</option>',
							'<option selected>Historian</option>',
							'<option selected>IT</option>',
							'<option selected>Philanthropy</option>',
							'<option selected>Social</option>',
							'<option selected>CA</option>',
							'<option selected>Other</option>',
						'</select></label>'].join('')).appendTo('.filter3');

					$('#gender-filter').on('change',function(){
						var option = $('#gender-filter').val();
						oTable.fnFilter(option,1);
					});

					var columnFilter = function(){
						var committees = $('#committee-filter').find('option:selected').map(function(){ return this.innerHTML; }).get(),
							ims = $('#im-filter').val(),
							n = 0;

						if(ims === '2'){
							committees = [];
							$('#committee-filter').parent().find('.dropdown-toggle').attr('disabled','disabled');
						}else{
							$('#committee-filter').parent().find('.dropdown-toggle').removeAttr('disabled');
						}

						for(i=0; i<events.length; i++){
							if(committees.indexOf(events[i].committee) !== -1 && (ims !== '1' || events[i].type !== 'im') || (ims === '2' && events[i].type === 'im')){
								oTable.fnSetColumnVis(event_targets[i],true,false);
								columns.eq(i).show();
								n++;
							}else{
								oTable.fnSetColumnVis(event_targets[i],false,false);
								columns.eq(i).hide();
							}
						}

						var cols_width = nameColWidth + (eventColWidth+1)*n + (totalsColWidth+1)*totals_targets.length + 50;
						$('.container').css('min-width', cols_width+'px');

						oTable.fnDraw();
					};

					$('#im-filter').on('change',columnFilter);



					$('.multiselect').multiselect({
						buttonClass: 'btn btn-default',
						onChange: columnFilter
					});

					/*$(['',
						'<label>Limit Cols:<br/><select class="form-control" id="count-filter">',
							'<option value="-1">All</option>',
							'<option value="30">30</option>',
							'<option value="20">20</option>',
							'<option value="10">10</option>',
						'</select></label>'].join('')).appendTo('.filter4');

					$('#count-filter').on('change',function(event){
						var count = event.target.value,
						columns = $('#columns').find('li');

						for(var i=0; i<event_targets.length; i++){
							if(i < count || count == -1){
								oTable.fnSetColumnVis(event_targets.length - i + 2, true, false);
								columns.eq(event_targets.length - i).show();
							}else{
								oTable.fnSetColumnVis(event_targets.length - i + 2, false, false);
								columns.eq(event_targets.length - i).hide();
							}
						}

						oTable.fnDraw();

						var cols_width = nameColWidth + (eventColWidth+1)*(count == -1 ? event_targets.length : count) +
							(totalsColWidth+1)*totals_targets.length + 50;
						$('.container').css('min-width', cols_width+'px');

					});*/

					var cols_width = nameColWidth+(eventColWidth+1)*event_targets.length + (totalsColWidth+1)*totals_targets.length + 50;

					$('.container').css('min-width',cols_width+'px');
					$('.header-row').attr('id','columns');

					for(i=0; i<event_names.length; i++){
						$('<li />').text(event_names[i]).popover({
							trigger: 'hover',
							html: true,
							title: event_names[i],
							content: ['Date: ',event_dates[i],'<br/>Attendees: ',events[i].attendees,
								(events[i].description.length > 0 ? '<br/>Description: ' + events[i].description : '')].join(''),
							placement: 'bottom',
							container: '#table'
						}).appendTo('#columns');
					}
					columns = $('#columns').find('li');

					//Append 'totals' column labels
					$('<li />').addClass('totals-label').text('Events Total').appendTo('#columns');
					$('<li />').addClass('totals-label').text('Helper Points').appendTo('#columns');
					$('<li />').addClass('totals-label').text('IM Sports').appendTo('#columns');
					$('<li />').addClass('totals-label').text('Standing Committees').appendTo('#columns');
					$('<li />').addClass('totals-label').text('Position-Related').appendTo('#columns');
					$('<li />').addClass('totals-label').text('Total').appendTo('#columns');

					//event handler for column labels
					var headers = $('#table').find('th');
					columns.each(function(index){
						$(this).on('click',function(){headers.eq(index+1).click();});
					});
				}
			});
		}/*,
		animationQueue: { show: [], hide: [] },
		processAnimationQueue: function(){
			var oTable = $('#table').dataTable(),
			columns = $('#columns').find('li');

			if(table.animationQueue.show.length > 0){
				ind = table.animationQueue.show.shift();
				oTable.fnSetColumnVis(ind, true);
				columns.eq(ind-2).show({
					duration: 600,
					complete: function(){
						table.processAnimationQueue();
					}
				});
			}else if(table.animationQueue.hide.length > 0){
				ind = table.animationQueue.hide.shift();
				oTable.fnSetColumnVis(ind, false);
				columns.eq(ind-2).hide({
					duration: 600,
					complete: function(){
						table.processAnimationQueue();
					}
				});
			}
		}*/
	},

	correction = {
		init: function(){
			//nav
			$('.nav li').eq(2).addClass('active');

			$.getJSON('ajax/getSlivkans.php',function(data){
				slivkans = data.slivkans;
				nicknames = data.nicknames;

				//tack on nicknames to slivkans
				for(var i=0; i<nicknames.length; i++){
					var ind = slivkans.indexOfKey('nu_email',nicknames[i].nu_email);
					if(ind !== -1){
						slivkans[ind].tokens.push(nicknames[i].nickname);
					}
				}

				$('#filled-by').typeahead(common.typeaheadOpts('slivkans', slivkans));
			});

			$.getJSON('ajax/getEvents.php',function(events){
				for(var i=events.length-1; i>=0; i--){
					$('<option></option>').text(events[i].event_name).appendTo('#event-name');
				}
			});

			//event handlers
			$('#filled-by').on('focusout', correction.validateFilledBy);
			$('#submit').on('click', correction.validatePointsCorrectionForm);
			$('#reset').on('click', correction.resetForm);
		},
		validatePointsCorrectionForm: function(){
			var valid = true,
			errors = [];

			if(!correction.validateFilledBy()){ valid = false; errors.push('Your Name'); }
			if($('#event-name').val() == 'Select One'){ valid = false; errors.push('Event Name'); }

			if(valid){
				$('#submit-error').fadeOut();
				correction.submitPointsCorrection();
			}else{
				$('#submit-error').text('Validation errors in: '+errors.join(', ')).fadeIn();
			}
		},
		validateFilledBy: function(){
			var valid, name = $('#filled-by').val();

			$('.filled-by-control').removeClass('has-warning');

			if(name.length > 0){
				valid = slivkans.indexOfKey('full_name',name) != -1;
				common.updateValidity($('.filled-by-control'),valid);
			}else{
				$('.filled-by-control').addClass('error');
				valid = false;
			}

			return valid;
		},
		resetForm: function(){
			$('#filled-by').val(''); $('.filled-by-control').removeClass('has-success').removeClass('has-error');
			$('#event-name').val('Select One');
			$('#comments').val('');
			$('#submit-error').fadeOut();
		},
		submitPointsCorrection: function(){
			var data = {
				event_name: $('#event-name').val(),
				name: $('#filled-by').val(),
				sender_email: slivkans[slivkans.indexOfKey('full_name', $('#filled-by').val())].nu_email,
				comments: $('#comments').val()
			};
			$('#response').fadeOut();

			$.getJSON('./ajax/sendPointsCorrection.php',data,function(response){
				$('#response').text('Response: '+response.message);
				$('#form-actions').html('<button type="button" class="btn btn-primary" href="table.php">View Points</button>'+
					'<button type="button" class="btn btn-default" href="correction.php">Submit Another</button>');
				$('#response').fadeIn();
			});
		}
	},

	submission = {
		init: function(){
			//nav
			$('.nav li').eq(3).addClass('active');
			//prevent [Enter] from causing form submit
			$(window).on('keydown',	function(event){
				if(event.keyCode == 13) {
					event.preventDefault();
					return false;
				}
			});

			$.getJSON('ajax/getSlivkans.php',function(data){
				slivkans = data.slivkans;
				nicknames = data.nicknames;
				fellows = data.fellows;
				var im_teams = data.quarter_info.im_teams;

				//tack on nicknames to slivkans
				for(var i=0; i<nicknames.length; i++){
					var ind = slivkans.indexOfKey('nu_email',nicknames[i].nu_email);
					if(ind !== -1){
						slivkans[ind].tokens.push(nicknames[i].nickname);
					}
				}

				//initialization
				submission.appendSlivkanInputs(14);
				submission.appendFellowInputs(9);

				//im teams
				for(i=0; i<im_teams.length; i++){
					$('<option />').text(im_teams[i]).appendTo('#im-team');
				}

				//loading saved values
				if(localStorage.spc_sub_committee){
					$('#committee').val(localStorage.spc_sub_committee);
					//submission.validateCommittee();
				}
				if(localStorage.spc_sub_attendees){
					var attendees = localStorage.spc_sub_attendees.split(', ');
					if(attendees.length > 14){ submission.appendSlivkanInputs(attendees.length - 14); }
					submission.addSlivkans(attendees);
				}
				if(localStorage.spc_sub_filledby){
					$('#filled-by').val(localStorage.spc_sub_filledby);
					submission.validateFilledBy();
				}
				if(localStorage.spc_sub_type && localStorage.spc_sub_type != 'Other'){
					$('input[value="'+localStorage.spc_sub_type+'"]:radio').parent().click();
				}
				if(localStorage.spc_sub_date){
					$('#date').val(localStorage.spc_sub_date);
				}
				if(localStorage.spc_sub_name){
					$('#event').val(localStorage.spc_sub_name);
					submission.validateEventName();
				}
				if(localStorage.spc_sub_description){
					$('#description').val(localStorage.spc_sub_description);
					submission.validateDescription();
				}
				if(localStorage.spc_sub_comments){
					$('#comments').val(localStorage.spc_sub_comments);
				}
				if(localStorage.spc_sub_fellows){
					var fellow_attendees = localStorage.spc_sub_fellows.split(', '), fellow_entry;
					if(fellow_attendees.length > 9){ submission.appendFellowInputs(fellow_attendees.length - 9); }

					for(i=0; i<fellow_attendees.length; i++){
						fellow_entry = $('.fellow-entry').eq(i);
						fellow_entry.val(fellow_attendees[i]);
						submission.validateFellowName(fellow_entry.closest('.form-group'));
					}
				}

				//autocomplete and events for slivkan/fellow inputs
				$('#filled-by').typeahead(common.typeaheadOpts('slivkans', slivkans));

				$('#slivkan-entry-tab')	.on('focus','.slivkan-entry',submission.handlers.slivkanTypeahead)
										.on('typeahead:closed','.slivkan-entry.tt-query',submission.handlers.validateSlivkanName)
										.on('click','.bonus-point',submission.handlers.toggleActive);

				$('#fellow-entry-tab')	.on('focus','.fellow-entry',submission.handlers.fellowTypeahead)
										.on('typeahead:closed','.fellow-entry.tt-query',submission.handlers.validateFellowName);
			});

			/*$('#date').datepicker({
				minDate: -5,
				maxDate: 0,
				dateFormat: 'm/d',
				showOn: 'button',
				buttonText: '',
				altField: '#date-val',
				altFormat: 'yy-mm-dd',
				onSelect: function(date){
					submission.validateEventName();
					localStorage.spc_sub_date = date;
				}
			});
			$('#date').datepicker('setDate', new Date());
			$('button.ui-datepicker-trigger').addClass('btn btn-default').html('<i class="glyphicon glyphicon-calendar"></i>')
				.wrap('<div class="input-group-btn"></div>');
			*/
			//dates
			for(var i=0; i<5; i++){
				var date = moment().subtract('days',i).format('YYYY-MM-DD');
				$('<option />').text(moment(date).format('ddd, M/D')).attr('value',date).appendTo('#date');
			}

			//event handlers for inputs
			$('#filled-by')			.on('focus',	submission.handlers.addClassWarning)
									.on('focusout',	submission.validateFilledBy);
			$('#type')				.on('click',	submission.toggleType);
			$('#event')				.on('focus',	submission.handlers.addClassWarning)
									.on('focusout',	submission.validateEventName);
			$('#date')				.on('change',	function(){ localStorage.spc_sub_date = $(this).val(); submission.validateEventName(); });
			$('#im-team')			.on('change',	submission.validateIMTeam);
			$('#committee')			.on('change',	submission.validateCommittee);
			$('#description')		.on('focusout',	submission.validateDescription);
			$('#comments')			.on('focusout',	function(){ localStorage.spc_sub_comments = $('#comments').val(); });
			$('#close-sort-alert')	.on('click',	function(){ $('#sort-alert').slideUp(); });
			$('#close-dupe-alert')	.on('click',	function(){ $('#duplicate-alert').slideUp(); });
			$('#sort-entries')		.on('click',	submission.sortEntries);
			$('#submit')			.on('click',	submission.validatePointsForm);
			$('#reset')				.on('click',	submission.resetForm);
			$('#bulk-names')		.on('keyup',	submission.processBulkNames);
			$('#add-bulk-names')	.on('click',	submission.addBulkNames);

			$('#tabs a:first').tab('show');
		},
		handlers: {
			addClassWarning: function(){
				$(this).closest('.form-group').addClass('has-warning');
			},
			slivkanTypeahead: function(){
				var target = $(this), slivkans_tmp = JSON.parse(JSON.stringify(slivkans));

				if(localStorage.spc_sub_attendees){
					var ind;
					localStorage.spc_sub_attendees.split(', ').forEach(function(el){
						ind = slivkans_tmp.indexOfKey('full_name',el.substr(0,el.length-2));
						if(ind !== -1){
							slivkans_tmp[ind].dupe = true;
						}
					});
				}

				if(target.closest('.slivkan-entry-control').addClass('has-warning').is(':last-child')){
					var num_inputs = $('#slivkan-entry-tab').find('.slivkan-entry').length;
					if(num_inputs < 120){
						submission.appendSlivkanInputs(1);
					}
				}
				if(!target.hasClass('tt-query')){
					target.typeahead(common.typeaheadOpts('slivkans'+Math.random(), slivkans_tmp)).focus();
				}
			},
			validateSlivkanName: function(){
				var target = $(this);
				if(target.hasClass('tt-query')){
					//needs a delay because typeahead.js seems to not like destroying on focusout
					setTimeout(function(target){
						submission.validateSlivkanName(target.typeahead('destroy').closest('.form-group'));
					},1,target);
				}
			},
			fellowTypeahead: function(){
				var target = $(this);
				if(target.closest('.fellow-entry-control').addClass('has-warning').is(':last-child')){
					var num_inputs = $('#fellow-entry-tab').find('.fellow-entry').length;
					if(num_inputs < 20){ submission.appendFellowInputs(1); }
				}
				if(!target.hasClass('tt-query')){
					target.typeahead(common.typeaheadOpts('fellows',fellows)).focus();
				}
			},
			validateFellowName : function(){
				var target = $(this);
				if(target.hasClass('tt-query')){
					//needs a delay because typeahead.js seems to not like destroying on focusout
					setTimeout(function(target){
						submission.validateFellowName(target.typeahead('destroy').closest('.form-group'));
					},1,target);
				}
			},
			toggleActive : function(){
				$(this).toggleClass('active');
				submission.saveSlivkans();
			}
		},
		appendSlivkanInputs: function(n){
			//2-4ms per insertion. Slow but acceptable.
			var cloned = $('#slivkan-entry-tab').find('.slivkan-entry-control').last(),
			start = parseInt(cloned.find('.input-group-addon').text(),10);
			for (var i=0; i<n; i++){
				cloned.clone().appendTo('#slivkan-entry-tab')
				.removeClass('has-warning')
				.find('.input-group-addon').text(start+i+1);
			}
		},
		appendFellowInputs: function(n){
			var cloned = $('#fellow-entry-tab').find('.fellow-entry-control').last(),
			start = parseInt(cloned.find('.input-group-addon').text(),10);
			for (var i=0; i<n; i++){
				cloned.clone().appendTo('#fellow-entry-tab')
				.removeClass('has-warning')
				.find('.input-group-addon').text(start+i+1);
			}
		},
		toggleType: function(event){
			type = $(event.target).find('input').val();

			//store value
			localStorage.spc_sub_type = type;

			//clear description if **previous** type was IM
			if($('.type-btn.active').val() == 'IM'){
				$('#description').val('');
				submission.validateDescription();
			}

			if(type == 'P2P'){
				$('#committee').val('Faculty');
				$('#event').val('P2P');
			}else if(type == 'IM'){
				$('#committee').val('Social');
				$('#event').val($('#im-team').val()+' 1');

				var sport = $('#im-team').val().split(' ');
				$('#description').val(sport[1]);
			}else if(type == 'House Meeting'){
				$('#committee').val('Exec');
				$('#event').val('House Meeting');
			}else{
				$('#event').val('');
			}
			submission.validateEventName();
			submission.validateCommittee();

			if(type == 'IM'){
				$('.im-team-control').slideDown();
				$('#event').attr('disabled','disabled');
			}else{
				$('.im-team-control').slideUp();
				$('#event').removeAttr('disabled');
			}

			if(type == 'Other'){
				$('.description-control').slideDown();
				$('#committee').removeAttr('disabled');
			}else{
				$('.description-control').slideUp();
				$('#committee').attr('disabled','disabled');
			}
		},
		validatePointsForm: function(){
			var valid = true, valid_slivkans = true, valid_fellows = true,
			errors = [];

			if (!submission.validateFilledBy()){ valid = false; errors.push('Filled By'); }
			if (!valid_event_name){ valid = false; common.updateValidity($('.event-control'),valid); errors.push('Name'); }
			if (!submission.validateCommittee()){ valid = false; errors.push('Committee'); }
			if (!submission.validateDescription()){ valid = false; errors.push('Description'); }

			$('.slivkan-entry-control').each(function(index){
				if(!submission.validateSlivkanName($(this),(index !== 0))){ valid_slivkans = false; }
			});

			if(!valid_slivkans){ valid = false; errors.push('Attendees'); }


			$('.fellow-entry-control').each(function(){
				if(!submission.validateFellowName($(this))){ valid_fellows = false; }
			});

			if(!valid_fellows){ valid = false; errors.push('Fellows'); }


			if(valid){
				$('#submit-error').fadeOut();
				submission.submitPointsForm();
			}else{
				$('#submit-error').text('Validation errors in: '+errors.join(', ')).fadeIn();
			}

			return valid;
		},
		validateEventName: function(){
			var valid = false, event_name = $('#event').val();

			//store value
			localStorage.spc_sub_name = event_name;

			valid_event_name = false;

			if((event_name.length <= 40 && event_name.length >= 8) || event_name == 'P2P'){
				event_name += [' ', $('#date').val()].join('');

				$.getJSON('ajax/getEvents.php',function(events){
					$('.event-control').removeClass('has-warning');

					if(events.length > 0){
						if(events.indexOfKey('event_name',event_name) != -1){
							if(type == 'IM'){
								var last = parseInt($('#event').val().slice(-1),10);
								$('#event').val($('#event').val().slice(0,-1) + (last+1).toString());
								submission.validateEventName();
							}else{
								valid_event_name = false;
								$('#event-name-error').fadeIn();
							}
						}else{
							valid_event_name = true;
							$('#event-name-error').fadeOut();
						}

					}else{
						valid_event_name = true;
					}
					$('#event-name-length-error').fadeOut();
					common.updateValidity($('.event-control'),valid_event_name);
				});
			}else{
				$('#event-name-length-error-count').html('Currently '+event_name.length+' characters');
				$('#event-name-length-error').fadeIn();
				common.updateValidity($('.event-control'),valid_event_name);
			}

			return valid;
		},
		validateIMTeam: function(){
			$('#event').val($('#im-team').val()+' 1');
			var sport = $('#im-team').val().split(' ');
			$('#description').val(sport[1]);
			submission.validateEventName();
		},
		validateCommittee: function(){
			var valid, committee = $('#committee').val();

			valid = committee != 'Select One';

			common.updateValidity($('.committee-control'),valid);

			$('.slivkan-entry-control').each(function(){
				submission.validateSlivkanName($(this),true);
			});

			//store values
			submission.saveSlivkans();
			localStorage.spc_sub_committee = committee;

			return valid;
		},
		validateDescription: function(){
			var valid = true, description = $('#description').val();

			//store value
			localStorage.spc_sub_description = description;

			if(description.length < 10 && type == 'Other'){
				valid = false;
				$('#description-length-error').fadeIn();
			}else{
				$('#description-length-error').fadeOut();
			}

			common.updateValidity($('.description-control'),valid);

			return valid;
		},
		validateFilledBy: function(){
			var valid = true, name = $('#filled-by').val(),
			nickname_ind = nicknames.indexOfKey('nickname',name);

			if (nickname_ind != -1){
				name = slivkans[slivkans.indexOfKey('nu_email',nicknames[nickname_ind].nu_email)].full_name;
				$('#filled-by').typeahead('setQuery',name);
			}

			//store value
			localStorage.spc_sub_filledby = name;

			$('.filled-by-control').removeClass('has-warning');

			if(name.length > 0){
				valid = slivkans.indexOfKey('full_name',name) != -1;
				common.updateValidity($('.filled-by-control'),valid);
			}else{
				$('.filled-by-control').addClass('error');
				valid = false;
			}

			return valid;
		},
		validateSlivkanName: function(entry,inBulk){
			var valid = true,
			slivkan_entry = entry.find('.slivkan-entry'),
			entry_button = entry.find('.btn'),
			name = slivkan_entry.val(),
			nickname_ind = nicknames.indexOfKey('nickname',name);

			if (nickname_ind != -1){
				name = slivkans[slivkans.indexOfKey('nu_email',nicknames[nickname_ind].nu_email)].full_name;
				slivkan_entry.val(name);
			}

			//only process individually
			if(!inBulk){
				var nameArray = [];

				//clear duplicates
				$('#slivkan-entry-tab').find('.slivkan-entry').each(function(){
					var self = $(this);
					if (self.val().length > 0){
						if (nameArray.indexOf(self.val()) == -1){
							nameArray.push(self.val());
						}else{
							self.val('');
							$('#duplicate-alert').slideDown();
							submission.validateSlivkanName(self.parent(),true);
						}
					}
				});

				//no names = invalid
				if(nameArray.length === 0){ valid = false; }

				//store values
				submission.saveSlivkans();

				//update name in case it changed
				name = slivkan_entry.val();
			}

			entry.removeClass('has-warning');

			if (name.length > 0){
				var name_ind = slivkans.indexOfKey('full_name',name);
				if(name_ind != -1){
					if(slivkans[name_ind].committee == $('#committee').val() && type != 'IM'){
						submission.showCommitteeMember(entry_button);
					}else if(type == 'IM' || slivkans[name_ind].committee == 'Facilities' || slivkans[name_ind].committee == 'Exec'){
						submission.hideButtons(entry_button);
					}else{
						submission.showHelperPoint(entry_button);
					}
				}else{ valid=false; }
				common.updateValidity(entry,valid);
			}else{
				entry.removeClass('has-success has-error');
				submission.hideButtons(entry_button);
			}

			return valid;
		},
		showHelperPoint: function(entry_button){ //quick: 46.15
			if(!entry_button.hasClass('helper-point')){
				entry_button.removeClass('committee-point disabled active').addClass('helper-point');
			}
		},
		showCommitteeMember: function(entry_button){
			if(!entry_button.hasClass('committee-point')){
				entry_button.removeClass('helper-point disabled active').addClass('committee-point active');
			}
		},
		hideButtons: function(entry_button){
			if(!entry_button.hasClass('disabled')){
				entry_button.removeClass('helper-point committee-point active').addClass('disabled');
			}
		},
		validateFellowName: function(entry){
			var valid = true,
			nameArray = [],
			fellow_entry = entry.find('.fellow-entry'),
			name = fellow_entry.val();

			//clear duplicates
			$('.fellow-entry').each(function(){
				if (nameArray.indexOf($(this).val()) != -1){
					$(this).val('');
					name='';
					$('#duplicate-alert').slideDown();
				}

				if ($(this).val().length > 0){
					nameArray.push($(this).val());
				}
			});

			//save fellows
			localStorage.spc_sub_fellows = nameArray.join(', ');

			entry.removeClass('has-warning');

			if (name.length > 0){
				valid = fellows.indexOfKey('full_name',name) != -1;
				common.updateValidity(entry,valid);
			}else{
				entry.removeClass('has-success has-error');
			}

			return valid;
		},
		processBulkNames: function(){
			var names = $('#bulk-names').val();

			//remove '__ mins ago' and blank lines
			names = names.replace(/(\d+ .+ago[\r\n]?$)|(^[\r\n])/gm,'');

			$('#bulk-names').val(names);
		},
		addBulkNames: function(){
			var slots = [],
			free_slots = 0,
			names = $('#bulk-names').val(),
			nameArray;

			$('#slivkan-entry-tab').find('.slivkan-entry').each(function(){
				if($(this).val().length > 0){
					slots.push(1);
				}else{
					slots.push(0);
					free_slots++;
				}
			});

			//if there's a hanging newline, remove it for adding but leave it in the textarea
			if (names[names.length-1] == '\r' || names[names.length-1] == '\n'){
				names = names.slice(0,names.length-1);
			}

			nameArray = names.split(/[\r\n]/gm);

			if(nameArray.length >= free_slots){
				var n = nameArray.length - free_slots + 1;
				submission.appendSlivkanInputs(n);
				for(var k=0; k<n; k++){
					slots.push(0);
				}
			}

			var slivkan_entries = $('#slivkan-entry-tab').find('.slivkan-entry'),
			len = nameArray.length;
			for(var i=0; i<len; i++){
				var name = nameArray[i];

				//check if wildcard
				var wildcardInd = slivkans.indexOfKey('wildcard',name);
				if(wildcardInd != -1){
					name = slivkans[wildcardInd].full_name;
				}

				var ind = slots.indexOf(0);
				slots[ind] = 1;
				slivkan_entries.eq(ind).val(name);
				submission.validateSlivkanName(slivkan_entries.eq(ind).closest('.slivkan-entry-control'),(i < len-1));
			}
		},
		sortEntries: function(){
			var nameArray = [];

			nameArray = submission.saveSlivkans();

			//clear slivkans
			$('#slivkan-entry-tab').find('.slivkan-entry').val('');

			//reset buttons
			$('.bonus-point').removeClass('committee-point helper-point active').addClass('disabled');

			nameArray = nameArray.sort();

			submission.addSlivkans(nameArray);

			$('#sort-alert').slideDown();
		},
		saveSlivkans: function(){
			var nameArray = [];

			//forming name array, but appending values corresponding to the helper/committee buttons:
			//0 - unpressed, 1 - pressed
			$('#slivkan-entry-tab').find('.slivkan-entry-control').each(function(){
				var self = $(this), name = self.find('.slivkan-entry').val();
				if(name.length > 0){
					var h = (self.find('.helper-point').hasClass('active')) ? '1' : '0',
					c = (self.find('.committee-point').hasClass('active')) ? '1' : '0';

					nameArray.push(name+h+c);
				}
			});

			localStorage.spc_sub_attendees = nameArray.join(', ');

			return nameArray;
		},
		addSlivkans: function(nameArray){
			var entries = $('#slivkan-entry-tab').find('.slivkan-entry-control'),
			len = nameArray.length;

			for(var i=0; i<len; i++){
				var name = nameArray[i].slice(0,nameArray[i].length-2),
				h = nameArray[i].slice(nameArray[i].length-2,nameArray[i].length-1),
				c = nameArray[i].slice(nameArray[i].length-1);

				var entry = entries.eq(i);
				entry.find('.slivkan-entry').val(name);
				submission.validateSlivkanName(entry,(i < len-1));
				if(h=='1'){ entry.find('.helper-point').addClass('active'); }
				if(c=='0'){ entry.find('.committee-point').removeClass('active'); }
			}

			for(i; i<entries.length; i++){
				submission.validateSlivkanName(entries.eq(i),true);
			}
		},
		resetForm: function(force){
			if(force === 'force' || window.confirm('Reset form?')){
				$('.type-btn:last').click();
				$('#event').val(''); $('.event-control').removeClass('has-success has-warning has-error');
				$('#date').val(moment().format('ddd, M/D'));
				$('#description').val(''); $('.description-control').removeClass('has-success has-error');
				$('#committee').val('Select One'); $('.committee-control').removeClass('has-success has-error');
				$('#filled-by').val(''); $('.filled-by-control').removeClass('has-success has-error');
				$('#comments').val('');

				$('#slivkan-entry-tab').find('.slivkan-entry-control').slice(15).remove();

				$('#slivkan-entry-tab').find('.slivkan-entry').each(function(){
					$(this).val('');
					submission.validateSlivkanName($(this).closest('.form-group'),true);
				});
				submission.validateSlivkanName($('.slivkan-entry-control').last());

				$('.fellow-entry').each(function(){
					$(this).val('');
					submission.validateFellowName($(this).closest('.form-group'));
				});

				$('#event-name-error').fadeOut();
				$('#event-name-length-error').fadeOut();
				$('#description-length-error').fadeOut();
				$('#duplicate-error').fadeOut();
				$('#submit-error').fadeOut();

				localStorage.spc_sub_filledby = '';
				localStorage.spc_sub_type = '';
				localStorage.spc_sub_name = '';
				localStorage.spc_sub_date = '';
				localStorage.spc_sub_committee = '';
				localStorage.spc_sub_description = '';
				localStorage.spc_sub_comments = '';
				localStorage.spc_sub_attendees = '';
			}
		},
		submitPointsForm: function(){
			var data = {
				date: $('#date').val(),
				type: type.toLowerCase().replace(' ','_'),
				committee: $('#committee').val(),
				event_name: $('#event').val(),
				description: $('#description').val(),
				filled_by: slivkans[slivkans.indexOfKey('full_name',$('#filled-by').val())].nu_email,
				comments: $('#comments').val(),
				attendees: [],
				helper_points: [],
				committee_members: [],
				fellows: []
			};

			$('#slivkan-entry-tab').find('.slivkan-entry').each(function(){
				var name = $(this).val();
				if(name.length > 0){
					var nu_email = slivkans[slivkans.indexOfKey('full_name',name)].nu_email;
					data.attendees.push(nu_email);
					if($(this).parent().find('.helper-point').hasClass('active')){
						data.helper_points.push(nu_email);
					}else if($(this).parent().find('.committee-point').hasClass('active')){
						data.committee_members.push(nu_email);
					}
				}
			});

			$('.fellow-entry').each(function(){
				var name = $(this).val();
				if(name.length > 0){
					data.fellows.push(name);
				}
			});

			//clear receipt:
			$('.results-row').remove();

			var val;

			for(var obj in data){
				if(data.hasOwnProperty(obj)){
					if(obj == 'attendees' || obj == 'helper_points' || obj == 'committee_members' || obj == 'fellows'){
						val = data[obj].join(', ');
					}else{
						val = data[obj];
					}

					$('<tr class="results-row" />').append(
						$('<td class="results-label" />').html(obj)
					).append(
						$('<td class="results" />').html(val)
					).appendTo('#receipt tbody');
				}
			}

			$('#submit-results').modal('show');

			$('#real-submit').off('click');
			$('#real-submit').on('click',function(){
				$.getJSON('./ajax/submitPointsForm.php',data,function(data_in){
					$('#results-status').parent().removeClass('warning');
					if(data_in.error){
						$('#results-status').html('Error in Step '+data_in.step).parent().addClass('error');
					}else{
						$('#unconfirmed').fadeOut({complete: function(){$('#confirmed').fadeIn();}});
						$('#results-status').html('Success!').parent().addClass('success');

						submission.resetForm('force');
					}
				});
			});
		}
	},

	faq = {
		init: function(){
			//nav
			$('.nav li').eq(4).addClass('active');
		}
	};

	return {
		breakdown: breakdown,
		table: table,
		correction: correction,
		submission: submission,
		faq: faq
	};
});