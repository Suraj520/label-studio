/**
 * Performs a transition on an element
 * @param {HTMLElement} element
 * @param {Function} transition
 * @param {{
 * init: (element: HTMLElement) => void,
 * transition: (element: HTMLElement) => void,
 * onStart: (element: HTMLElement) => void,
 * beforeTransition: (element: HTMLElement) => void,
 * afterTransition: (element: HTMLElement) => void
 * }} param2
 */
const aroundTransition = (element, {init, transition, onStart, beforeTransition, afterTransition} = {}) => {
  init?.(element);

  const onTransitionStarted = () => {
    onStart?.(element);
  }

  const onTransitionEnded = () => {
    afterTransition?.(element);

    element.removeEventListener('transitionstart', onTransitionStarted);
    element.removeEventListener('transitionend', onTransitionEnded);
  }

  element.addEventListener('transitionstart', onTransitionStarted);
  element.addEventListener('transitionend', onTransitionEnded);

  beforeTransition?.();

  setTimeout(() => transition(element), 50);
}

const callOrReturn = (value, ...args) => value instanceof Function ? value(...args) : value;

const lsGet = (key) => localStorage.getItem(key)

const lsSet = (key, value) => localStorage.setItem(key, value)

/**
 *
 * @param {HTMLElement} element
 * @param {string} selector
 */
const matchesSelector = (element, selector) => {
  if (element?.matches?.(selector) || element?.closest?.(selector)) return true
  return false
}

/**
 * @param {HTMLElement} menu
 */
const setMenuState = (menu, {visible, animate} = {}) => {
  const classState = {
    beforeAppear: 'menu-dropdown-before-appear',
    appear: 'menu-dropdown-appear',
    beforeDisappear: 'menu-dropdown-before-disappear',
    disappear: 'menu-dropdown-disappear',
  }
  const classVisible = 'menu-dropdown-visible';
  const currentlyVisible = menu.classList.contains(classVisible);

  if (currentlyVisible === visible) return visible;

  if (animate !== false) {
    aroundTransition(menu, {
      transition() {
        menu.classList.add(visible ? classState.appear : classState.disappear);
      },
      beforeTransition() {
        menu.classList.add(visible ? classState.beforeAppear : classState.beforeDisappear);
      },
      afterTransition() {
        menu.classList.remove(...Object.values(classState));
        menu.classList[visible ? 'add' : 'remove'](classVisible);
      }
    });
  } else {
    menu.classList[visible ? 'add' : 'remove'](classVisible);
  }

  return !currentlyVisible;
}

const toggleMenu = (menu, options = {}) => {
  const classVisible = 'menu-dropdown-visible';
  let currentlyVisible = menu.classList.contains(classVisible);

  return setMenuState(menu, {
    ...(options ?? {}),
    visible: currentlyVisible ? false : true
  });
}

const attachMenu = (triggerSelector, {
  trigger = 'mousedown',
  closeOnClickOutside = true,
  onMenuToggle,
  animate = true,
  defaultVisible = false,
} = {}) => {
  /** @type {HTMLElement} */
  let menuDropdown = (() => {
    const triggeringElement = document.querySelector(triggerSelector);
    const menuSelector = triggeringElement.dataset?.menu;

    return menuSelector
      ? document.querySelector(menuSelector)
      : triggeringElement.querySelector('.menu-dropdown');
  })();

  const shoudlCloseOnClickOutside = () => {
    return callOrReturn(closeOnClickOutside, menuDropdown);
  }

  const clickedOutside = (target) => {
    return menuDropdown && !menuDropdown.contains(target);
  }

  const shouldAnimate = () => {
    return callOrReturn(animate, menuDropdown);
  }

  if (defaultVisible) {
    setMenuState(menuDropdown, {
      visible: true,
      animate: false,
    })
  }

  document.addEventListener(trigger, (e) => {
    if (matchesSelector(e.target, triggerSelector)) {
      e.preventDefault();
      e.stopPropagation();

      const state = toggleMenu(menuDropdown, {
        animate: shouldAnimate()
      });

      onMenuToggle?.(menuDropdown, state);
    } else if (clickedOutside(e.target) && shoudlCloseOnClickOutside()) {
      setMenuState(menuDropdown, {
        visible: false,
        animate: shouldAnimate()
      });
    }
  }, {capture: true});
}

const ls = {
  get menuVisible() { return lsGet(this._menuVisibility) == 'true' },
  set menuVisible(value) { return lsSet(this._menuVisibility, value) },
  get sidebarPinned() { return lsGet(this._sidebarPinned) == 'true' },
  set sidebarPinned(value) { return lsSet(this._sidebarPinned, value) },

  /**@private */
  _menuVisibility: 'main-menu-visible',
  /**@private */
  _sidebarPinned: 'sidebarPinned',
}

// Main menu
attachMenu('.main-menu-trigger', {
  defaultVisible: ls.sidebarPinned && ls.menuVisible,
  animate(menu) {
    return menu.classList.contains('sidebar-floating')
  },
  closeOnClickOutside(menu) {
    return menu.classList.contains('sidebar-floating')
  },
  onMenuToggle(_, visible) {
    ls.menuVisible = visible;
  }
});

// Project menu
attachMenu('.project-menu');

// Pin/unpin menu sidebar
document.addEventListener('click', (e) => {
  if (matchesSelector(e.target, '.sidebar__pin')) {
    e.preventDefault();

    const sidebar = document.querySelector('.sidebar')

    if (sidebar.classList.contains('sidebar-floating')) {
      sidebar.classList.remove('sidebar-floating');
      ls.sidebarPinned = true;
    } else {
      sidebar.classList.add('sidebar-floating');
      ls.sidebarPinned = false;
    }

    window.dispatchEvent(new Event('resize'));
  }
});

if (ls.sidebarPinned) {
  document.querySelector('.sidebar').classList.remove('sidebar-floating');
}
