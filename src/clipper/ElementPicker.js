(function () {
  /** Based on https://github.com/AlienKevin/html-element-picker */
  class ElementPicker {
    constructor(options) {
      // MUST create hover box first before applying options
      this.hoverBox = document.createElement('div');
      this.hoverBox.style.position = 'absolute';
      this.hoverBox.style.pointerEvents = 'none';

      const defaultOptions = {
        container: document.body,
        selectors: '*', // default to pick all elements
        background: 'rgba(153, 235, 255, 0.5)', // transparent light blue
        borderWidth: 5,
        transition: 'all 150ms ease', // set to "" (empty string) to disable
        ignoreElements: [document.body],
        action: {},
      };
      const mergedOptions = {
        ...defaultOptions,
        ...options,
      };
      Object.keys(mergedOptions).forEach((key) => {
        this[key] = mergedOptions[key];
      });

      this._detectMouseMove = (e) => {
        this._previousEvent = e;
        let target = e.target;
        // console.log("TCL: ElementPicker -> this._moveHoverBox -> target", target)
        if (
          (this.ignoreElements.indexOf(target) === -1 &&
            target.matches(this.selectors) &&
            this.container.contains(target)) ||
          target === this.hoverBox
        ) {
          // is NOT ignored elements
          // console.log("TCL: target", target);
          if (target === this.hoverBox) {
            // the truely hovered element behind the added hover box
            const hoveredElement = document.elementsFromPoint(e.clientX, e.clientY)[1];
            // console.log("screenX: " + e.screenX);
            // console.log("screenY: " + e.screenY);
            // console.log("TCL: hoveredElement", hoveredElement);
            if (this._previousTarget === hoveredElement) {
              // avoid repeated calculation and rendering
              return;
            } else {
              target = hoveredElement;
            }
          } else {
            this._previousTarget = target;
          }
          const targetOffset = target.getBoundingClientRect();
          const targetHeight = targetOffset.height;
          const targetWidth = targetOffset.width;

          this.hoverBox.style.width = targetWidth + this.borderWidth * 2 + 'px';
          this.hoverBox.style.height = targetHeight + this.borderWidth * 2 + 'px';
          // need scrollX and scrollY to account for scrolling
          this.hoverBox.style.top = targetOffset.top + window.scrollY - this.borderWidth + 'px';
          this.hoverBox.style.left = targetOffset.left + window.scrollX - this.borderWidth + 'px';
          if (this._triggered && this.action.callback) {
            this.action.callback(target, e);
            this._triggered = false;
          }
        } else {
          // console.log("hiding hover box...");
          this.hoverBox.style.width = 0;
        }
      };
      document.addEventListener('mousemove', this._detectMouseMove);
    }
    get container() {
      return this._container;
    }
    set container(value) {
      if (value instanceof HTMLElement) {
        this._container = value;
        this.container.appendChild(this.hoverBox);
      } else {
        throw new Error('Please specify an HTMLElement as container!');
      }
    }
    get background() {
      return this._background;
    }
    set background(value) {
      this._background = value;

      this.hoverBox.style.background = this.background;
    }
    get transition() {
      return this._transition;
    }
    set transition(value) {
      this._transition = value;

      this.hoverBox.style.transition = this.transition;
    }
    get borderWidth() {
      return this._borderWidth;
    }
    set borderWidth(value) {
      this._borderWidth = value;

      this._redetectMouseMove();
    }
    get selectors() {
      return this._selectors;
    }
    set selectors(value) {
      this._selectors = value;

      this._redetectMouseMove();
    }
    get ignoreElements() {
      return this._ignoreElements;
    }
    set ignoreElements(value) {
      this._ignoreElements = value;

      this._redetectMouseMove();
    }
    get action() {
      return this._action;
    }
    set action(value) {
      if (value instanceof Object) {
        if (typeof value.trigger === 'string' && typeof value.callback === 'function') {
          if (this._triggerListener) {
            document.removeEventListener(this.action.trigger, this._triggerListener);
            this._triggered = false;
          }
          this._action = value;

          this._triggerListener = (e) => {
            if (this.preventDefault) {
              e.preventDefault();
            }
            this._triggered = true;
            this._redetectMouseMove();
          };
          document.addEventListener(this.action.trigger, this._triggerListener);
        } else if (value.trigger !== undefined || value.callback !== undefined) {
          // allow empty action object
          throw new Error(
            'action must include two keys: trigger (String) and callback (function)!',
          );
        }
      } else {
        throw new Error('action must be an object!');
      }
    }
    close() {
      this.hoverBox.remove();
    }
    _redetectMouseMove() {
      if (this._detectMouseMove && this._previousEvent) {
        this._detectMouseMove(this._previousEvent);
      }
    }
    clean() {
      this.close();
      document.removeEventListener('mousemove', this._detectMouseMove);
      document.removeEventListener(this.action.trigger, this._triggerListener);
    }
  }
  // export module
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = ElementPicker;
  } else {
    window.ElementPicker = ElementPicker;
  }
})();
