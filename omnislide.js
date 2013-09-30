(function(){
	var OmniSlide = function OmniSlide (params) {
		var self = this;

		var defaults = {
			element: $(), // jQuery
			slide_master_selector: '.os_slide_master',
			slide_selector: '.os_slide',
			swipe_events: true
		};

		_.extend(self.options = {}, defaults, params);

		self.jq = {
			element: self.options.element.addClass('omnislide'),
			slide_master: self.options.element.find(self.options.slide_master_selector),
			slides: $()
		};

		self.position = 0;
		self.SIDs = [];
		self.slide_count = 0;
		self.last_index = 0;
		self.enabled = false;
		self.hold = false;
		self.events_bound = false;

		self.event_handlers = {
			show_by_sid: function (SID) {
				self.show_by_sid(SID);
			},

			next: function next (e) {
				e.stopPropagation();

				if (self.enabled && !self.hold) {
					self.next();
				};
			},

			previous: function previous (e) {
				e.stopPropagation();

				if (self.enabled && !self.hold) {
					self.previous();
				};
			},

			movestart: function movestart (e) {
				e.stopPropagation();

				if ((e.distX > e.distY && e.distX < -e.distY) || (e.distX < e.distY && e.distX > -e.distY) || !self.enabled || self.hold) {
					e.preventDefault();
					return;
				};

				self.jq.element.addClass('notransition');
			},

			move: function move (e) {
				e.stopPropagation();

				if (self.enabled && !self.hold) {
					var left = 100 * e.distX / self.jq.element.width();

					if (e.distX < 0) {
						if (self.position === self.last_index) {
							self.jq.slides[self.position].style.left = left/4 + '%';
						} else {
							self.jq.slides[self.position].style.left = left + '%';
							self.jq.slides[self.position+1].style.left = (left+100)+'%';
						};
					};

					if (e.distX > 0) {
						if (self.position > 0) {
							self.jq.slides[self.position].style.left = left + '%';
							self.jq.slides[self.position-1].style.left = (left-100)+'%';
						} else {
							self.jq.slides[self.position].style.left = left/5 + '%';
						};
					};
				};
			},

			moveend: function moveend (e) {
				e.stopPropagation();

				if (self.enabled && !self.hold) {
					self.jq.element.removeClass('notransition');
					var counter = self.jq.slides.length;
					while (counter--) {
						 self.jq.slides[counter].style.left = '';
					};
				};
			}
		};


		self.determinePosition();
	};

	__.augment(OmniSlide, __.PubSubPattern);

	OmniSlide.prototype.determinePosition = function () {
		var self = this;

		if (self.slide_count < 2) {
			self.setPosition(null);
		} else if (self.position === 0) {
			self.setPosition('start');
		} else if (self.position === self.slide_count-1) {
			self.setPosition('end');
		} else {
			self.setPosition('middle');
		};
	};

	OmniSlide.prototype.setEnabled = function (enabled) {
		var self = this;

		self.enabled = enabled;
		if (self.enabled) {
			self.jq.slides = self.jq.element.find(self.options.slide_selector);
			self.slide_count = self.jq.slides.length;
			self.SIDs = self.get_SIDs();
			self.last_index = self.slide_count - 1;

			self.jq.element.addClass('enabled');
			self.jq.element.addClass('notransition');
			self.jq.slides.addClass('omnislide_slide');

			if (!self.events_bound) {
				self.bindEvents();
			};
		} else {
			self.jq.element.removeClass('enabled');
			self.jq.slides.removeClass('omnislide_slide');
			self.jq.element.removeClass('notransition');
			self.unBindEvents();
		};

		self.fire('enable_change', self.enabled);
	};

	OmniSlide.prototype.show_by_sid = function show_by_sid (SID) {
		var self = this;

		var $slide = self.jq.slides.filter('[data-sid="' + SID + '"]');

		if ($slide.length) {
			self.moveTo(_.indexOf(self.jq.slides, $slide[0]));
		};
	};

	OmniSlide.prototype.get_SIDs = function get_SIDs () {
		var self = this;

		var counter = 0, limit = self.jq.slides.length, sids = [];
		while (counter < limit) {
			sids.push(self.jq.slides[counter].getAttribute('data-sid'));
			counter++;
		};

		return sids;
	};

	OmniSlide.prototype.bindEvents = function bindEvents () {
		var self = this;

		if (self.options.swipe_events) {
			self.jq.slides
			.on('swipeleft', self.event_handlers.next)
			.on('swiperight', self.event_handlers.previous)
			.on('movestart', self.event_handlers.movestart)
			.on('move', self.event_handlers.move)
			.on('moveend', self.event_handlers.moveend);

			self.events_bound = true;
		};

		__.globalevents.on('show_by_sid', self.event_handlers.show_by_sid);
	};

	OmniSlide.prototype.unBindEvents = function unBindEvents () {
		var self = this;

		if (self.options.swipe_events) {
			self.jq.slides
			.off('swipeleft', self.event_handlers.next)
			.off('swiperight', self.event_handlers.previous)
			.off('movestart', self.event_handlers.movestart)
			.off('move', self.event_handlers.move)
			.off('moveend', self.event_handlers.moveend);

			self.events_bound = false;
		};

		__.globalevents.off('show_by_sid', self.event_handlers.show_by_sid);
	};

	OmniSlide.prototype.setHold = function setHold (hold) {
		var self = this;

		self.hold = hold;
		self.fire('hold', self.hold);
	};

	OmniSlide.prototype.setPosition = function (targetPosition) {
		var self = this;

		self.jq.element.removeClass('start middle end').addClass(targetPosition);
	};

	OmniSlide.prototype.next = function (immediately) {
		var self = this;

		self.moveTo(self.position+1, immediately);
		self.fire('next');
	};

	OmniSlide.prototype.previous = function (immediately) {
		var self = this;

		self.moveTo(self.position-1, immediately);
		self.fire('previous');
	};

	OmniSlide.prototype.moveTo = function (index, immediately, silent) {
		var self = this;

		// if (!self.enabled) { return; };

		if (index < 0) {
			return self.fire('leading_boundary', index);
		} else if (index > self.slide_count-1) {
			return self.fire('trailing_boundary', index);
		};

		self.position = index;
		if (self.current_slide) { self.current_slide.removeClass('omnislide_active'); };
		self.current_slide = self.jq.slides.eq(self.position);
		self.determinePosition();

		self.fire('before_move', self.position);

		if (immediately) {
			self.jq.element.addClass('notransition');

			window.setTimeout(function(){
				self.jq.element.removeClass('notransition');
			}, 500);
		} else {
			self.jq.element.removeClass('notransition');
		};

		self.current_slide.addClass('omnislide_active');
		self.jq.slides.removeClass('omnislide_after');

		var counter = self.position+1;
		while (counter <= self.last_index) {
			self.jq.slides.eq(counter).addClass('omnislide_after');
			counter++;
		};

		if (!silent) { self.fire('move', self.position); };
	};

	this.provide('Constructors.OmniSlide', OmniSlide);
}).call(this['LUCID'] = this['LUCID'] || new __.ModularNamespace());
