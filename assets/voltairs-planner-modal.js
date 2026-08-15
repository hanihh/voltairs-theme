/**
 * Drives the "See how it works" modal for the free AI travel planner.
 *
 * The gift row it hangs off is rendered by the Bundlex app, so there is no Liquid
 * hook to attach to and no markup we control. The trigger is therefore injected by
 * matching the row's title text, and re-injected whenever the app re-renders, which
 * it does every time the shopper switches offer.
 *
 * Markup and copy come from snippets/voltairs-planner-modal.liquid. The demo answers
 * live in the HTML rather than in here so they stay editable next to the rest of the
 * copy, and so they are still readable if this script never runs.
 *
 * Opened, the modal plays itself: each slide runs, holds a beat, and hands over to
 * the next, so nobody is left on a finished animation wondering what to do. The
 * first thing the shopper does — an arrow, a dot, a swipe, replay — hands them the
 * wheel, and it stops moving on its own until the modal is opened again.
 */

const CONFIG_ID = 'voltairs-planner-modal-config';

/** Typing speed for a column that does not set its own, in characters per second. */
const SPEED_FALLBACK = 80;

/** Pauses between the moves of a sequence, in milliseconds. */
const BEAT = {
  betweenGroups: 620,
  beforeReply: 380,
  afterReply: 260,
  optionStagger: 130,
  beforePick: 620,
  afterPick: 420,
  /** Matches the pointer's transition in the stylesheet. */
  move: 820,
  click: 460,
  /** The beat a finished slide holds for before the modal moves itself on. */
  handOff: 1000,
  /** How long a slide-to-slide scroll is given to arrive. */
  settle: 600,
};

const dialog = /** @type {HTMLDialogElement | null} */ (document.getElementById('vpm-dialog'));
const configEl = document.getElementById(CONFIG_ID);

if (dialog && configEl?.textContent && !dialog.dataset.vpmReady) {
  dialog.dataset.vpmReady = 'true';
  init(dialog, JSON.parse(configEl.textContent));
}

/**
 * @typedef {{labels: string[], linkLabel: string, linkColor: string}} PlannerModalConfig
 */

/**
 * @param {HTMLDialogElement} root
 * @param {PlannerModalConfig} config
 */
function init(root, config) {
  const track = /** @type {HTMLElement} */ (root.querySelector('[data-vpm-track]'));
  const slides = /** @type {HTMLElement[]} */ ([...root.querySelectorAll('[data-vpm-slide]')]);
  const dots = /** @type {HTMLButtonElement[]} */ ([...root.querySelectorAll('[data-vpm-dot]')]);
  const prev = /** @type {HTMLButtonElement} */ (root.querySelector('[data-vpm-prev]'));
  const next = /** @type {HTMLButtonElement} */ (root.querySelector('[data-vpm-next]'));
  const demo = /** @type {HTMLElement} */ (root.querySelector('[data-vpm-demo]'));
  const replay = root.querySelector('[data-vpm-replay]');
  const labels = config.labels.map((label) => label.trim().toLowerCase()).filter(Boolean);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // A sequence plays its steps in document order, so the running order is edited in
  // the snippet rather than in here. A slide holding more than one plays them back to
  // back: that is what the two sides of the comparison are.
  const scenes = slides
    .map((slide) => ({
      slide,
      groups: /** @type {HTMLElement[]} */ ([...slide.querySelectorAll('[data-vpm-seq]')]).map((el) => ({
        el,
        cps: Number(el.dataset.vpmSpeed) || SPEED_FALLBACK,
        loop: Number(el.dataset.vpmLoop) || 0,
        steps: /** @type {HTMLElement[]} */ ([...el.querySelectorAll('[data-vpm-step]')]),
      })),
    }))
    .filter((scene) => scene.groups.length > 0);

  /** Full text of every typed step, taken before the first play empties them. */
  const texts = new WeakMap();

  for (const scene of scenes) {
    for (const group of scene.groups) {
      for (const step of group.steps) {
        if (step.dataset.vpmStep === 'type') texts.set(step, normalise(step.textContent ?? ''));
      }
    }
  }

  let index = 0;
  let generation = 0;
  let scrollFrame = 0;

  /** Set while a scroll of ours is still travelling; see goTo. */
  let seeking = 0;

  /**
   * The modal walks itself from slide to slide until the shopper takes the wheel,
   * after which it stays wherever it is put. Reset on every open.
   */
  let auto = true;

  /** Pending visibility waits, each a function that disconnects and gives up. */
  const watchers = new Set();
  let injectFrame = 0;
  let restoreFocusTo = /** @type {HTMLElement | null} */ (null);

  /* ------------------------------------------------------------- trigger */

  /**
   * Builds the link that opens the modal.
   * @returns {HTMLButtonElement}
   */
  function makeTrigger() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vpm-open';
    button.dataset.vpmOpen = 'true';
    button.setAttribute('aria-haspopup', 'dialog');
    button.innerHTML = `${escapeHtml(config.linkLabel)}<span class="vpm-open-arrow" aria-hidden="true">&rsaquo;</span>`;

    // The row is usually a label wired to the offer's own control, so the click has
    // to stop here or opening the modal also re-picks the offer.
    for (const type of ['pointerdown', 'mousedown', 'click']) {
      button.addEventListener(type, (event) => {
        event.stopPropagation();
        if (type === 'click') {
          event.preventDefault();
          open();
        }
      });
    }

    return button;
  }

  /**
   * Finds the element holding the gift row's title, matched on its exact text.
   * @returns {HTMLElement | null}
   */
  function findTitle() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const text = node.textContent?.trim() ?? '';

        if (text.length < 3 || text.length > 80) return NodeFilter.FILTER_REJECT;

        return labels.includes(text.toLowerCase()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });

    while (walker.nextNode()) {
      const host = walker.currentNode.parentElement;

      if (host && !root.contains(host)) return host;
    }

    return null;
  }

  /**
   * Places the trigger under the gift row. Prefers the block that holds both title
   * and subtitle so the link lands beneath them, and falls back to the title itself
   * when that block turns out to be the whole card.
   */
  function inject() {
    if (document.querySelector('[data-vpm-open]')) return;

    const title = findTitle();

    if (!title) return;

    const parent = title.parentElement;
    const host = parent && (parent.textContent?.trim().length ?? 0) <= 200 ? parent : title;
    const trigger = makeTrigger();

    tint(trigger);
    host.appendChild(trigger);
  }

  /**
   * Paints the trigger the colour the snippet asks for.
   *
   * Two cleverer versions of this failed on the real row. Inheriting the block's
   * colour gave near-black, because that block keeps the card's dark default and
   * only the title and subtitle are repainted. Reading the background and picking
   * for contrast then gave navy on navy, so whatever paints that card is not a
   * background-color on an ancestor we can walk to. The row is navy and stays navy,
   * so the colour is simply stated in the snippet now.
   *
   * It is set inline and forced because this link lives inside markup the app owns,
   * and a single class of ours loses to anything it scopes by id or a longer chain.
   * @param {HTMLElement} trigger
   */
  function tint(trigger) {
    if (!config.linkColor) return;

    trigger.style.setProperty('--vpm-open-color', config.linkColor);
    trigger.style.setProperty('color', config.linkColor, 'important');
  }

  function scheduleInject() {
    if (injectFrame) return;

    injectFrame = requestAnimationFrame(() => {
      injectFrame = 0;
      inject();
    });
  }

  /* -------------------------------------------------------------- slider */

  /**
   * @param {number} to
   * @param {boolean} [smooth]
   */
  function goTo(to, smooth = true) {
    const clamped = Math.max(0, Math.min(slides.length - 1, to));

    // A smooth scroll fires scroll events the whole way there, and rounding those
    // mid-flight lands back on the slide being left, which restarts it. The index is
    // set here anyway, so nothing is read off the track until it has arrived.
    clearTimeout(seeking);
    seeking = smooth ? setTimeout(() => (seeking = 0), BEAT.settle) : 0;

    track.scrollTo({ left: track.clientWidth * clamped, behavior: smooth ? 'smooth' : 'auto' });
    setIndex(clamped);
  }

  /** @param {number} to */
  function setIndex(to) {
    if (to === index) return;

    index = to;
    prev.disabled = index === 0;
    next.disabled = index === slides.length - 1;

    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === index)));
    slides.forEach((slide, i) => {
      slide.toggleAttribute('inert', i !== index);
      // Off-screen slides stop animating; see the lane rule in the stylesheet.
      slide.classList.toggle('is-active', i === index);
    });

    play(index);
  }

  /** Stops the modal driving itself, the moment the shopper does anything at all. */
  function takeOver() {
    auto = false;

    // A hand on the track outranks whatever scroll the modal still had in flight.
    clearTimeout(seeking);
    seeking = 0;
  }

  track.addEventListener(
    'scroll',
    () => {
      if (scrollFrame || seeking) return;

      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        if (track.clientWidth) setIndex(Math.round(track.scrollLeft / track.clientWidth));
      });
    },
    { passive: true }
  );

  /* ----------------------------------------------------------- sequences */

  /** @typedef {{el: HTMLElement, cps: number, loop: number, steps: HTMLElement[]}} Group */
  /** @typedef {{slide: HTMLElement, groups: Group[]}} Scene */

  /**
   * Rewinds a scene to its opening state. It does not touch `generation`, so a loop
   * can rewind between runs without cancelling the run doing the rewinding.
   * @param {Scene} scene
   */
  function resetScene(scene) {
    if (demo && scene.slide.contains(demo)) demo.dataset.stage = 'idle';

    for (const group of scene.groups) {
      group.el.classList.remove('is-done');

      if (group.el.dataset.phase) group.el.dataset.phase = 'idle';

      for (const step of group.steps) {
        step.classList.remove('is-in', 'is-typing');

        for (const child of step.children) child.classList.remove('is-in', 'is-picked');

        if (step.dataset.vpmStep === 'type') step.textContent = '';
      }

      parkCursor(group);
    }
  }

  /**
   * Waits until an element is actually on screen. A slide can be the current one and
   * still have most of itself below the fold: on a phone the two demo columns stack,
   * so the planner conversation sits well under the first one. Without this it types
   * itself out, and finishes, long before anyone has scrolled down to watch it.
   *
   * Resolves false when the run has been superseded, so callers bail the same way
   * they do for a cancelled wait. Browsers without the observer just carry on.
   * @param {HTMLElement} el
   * @param {number} token
   * @returns {Promise<boolean>}
   */
  function onScreen(el, token) {
    if (typeof IntersectionObserver !== 'function') return Promise.resolve(generation === token);

    return new Promise((resolve) => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;

          release();
          resolve(generation === token);
        },
        { threshold: 0.2 }
      );

      const release = () => {
        observer.disconnect();
        watchers.delete(release);
      };

      // A swipe away has to let go of this, or the run behind it never unwinds.
      watchers.add(() => {
        release();
        resolve(false);
      });

      observer.observe(el);
    });
  }

  /** Releases every pending visibility wait. */
  function releaseWatchers() {
    for (const release of [...watchers]) release();

    watchers.clear();
  }

  /**
   * Cancels whatever was running, plays whatever slide `i` has to play, and then,
   * unless the shopper has taken the wheel, hands over to the next slide.
   * @param {number} i
   */
  function play(i) {
    generation += 1;
    releaseWatchers();

    const slide = slides[i];

    if (!slide) return;

    const token = generation;
    const scene = scenes.find((entry) => entry.slide === slide);

    if (scene) resetScene(scene);

    // Everything is already in its finished state for anyone who does not want the
    // motion, and moving them on unasked would be motion of exactly that kind.
    if (reducedMotion.matches) {
      if (scene) settle(scene);

      return;
    }

    // A slide with no sequence of its own still deals itself out in CSS and says how
    // long that takes, so there is something to wait for either way.
    const hold = Number(slide.dataset.vpmHold) || 0;

    if (!scene && !hold) return;

    const played = scene ? run(scene, token) : wait(hold, token);

    played.then((finished) => {
      if (finished) handOff(i, token);
    });
  }

  /**
   * Whether a finished slide is going to give way to the next one. A slide that is
   * handing over does not also loop, and the last one has nowhere to hand over to.
   * @param {number} i
   */
  function willHandOff(i) {
    return auto && i > -1 && i < slides.length - 1;
  }

  /**
   * Moves on to the next slide a beat after this one has played out. This is the
   * whole point of the modal running itself: someone who has just watched slide one
   * finish should not have to work out that there are two more behind it.
   * @param {number} from
   * @param {number} token
   */
  function handOff(from, token) {
    if (!willHandOff(from)) return;

    wait(BEAT.handOff, token).then((alive) => {
      if (alive && auto) goTo(from + 1);
    });
  }

  /**
   * Jumps a scene to its finished state, for anyone who does not want the motion.
   * @param {Scene} scene
   */
  function settle(scene) {
    for (const group of scene.groups) {
      for (const step of group.steps) {
        if (step.dataset.vpmStep === 'type') step.textContent = texts.get(step) ?? '';

        step.classList.add('is-in');

        for (const child of step.children) child.classList.add('is-in');

        if (step.dataset.vpmStep === 'state') group.el.dataset.phase = step.dataset.vpmState ?? 'idle';
      }

      group.el.classList.add('is-done');
    }

    if (demo && scene.slide.contains(demo)) demo.dataset.stage = 'done';
  }

  /**
   * Plays a scene's groups in turn, marking each done as it lands. A group carrying
   * `data-vpm-loop` restarts the whole scene after that many milliseconds, which is
   * what a slide does when there is nowhere to hand over to: on a playthrough the
   * modal is driving, it gives way to the next slide instead of repeating itself.
   * `token` guards against a run left over from a swipe away, or from replay.
   * @param {Scene} scene
   * @param {number} token
   * @returns {Promise<boolean>} false if the run was superseded
   */
  async function run(scene, token) {
    const loop = scene.groups.find((group) => group.loop)?.loop ?? 0;

    for (;;) {
      if (demo && scene.slide.contains(demo)) demo.dataset.stage = 'running';

      for (const [i, group] of scene.groups.entries()) {
        if (!(await onScreen(group.el, token))) return false;

        for (const step of group.steps) {
          if (!(await playStep(step, group, token))) return false;
        }

        group.el.classList.add('is-done');

        if (i < scene.groups.length - 1 && !(await wait(BEAT.betweenGroups, token))) return false;
      }

      if (demo && scene.slide.contains(demo)) demo.dataset.stage = 'done';

      if (!loop || willHandOff(slides.indexOf(scene.slide))) return true;

      if (!(await wait(loop, token))) return false;

      resetScene(scene);
    }
  }

  /**
   * Runs one step. `type` writes text out character by character, `show` drops an
   * element in, `reveal` fans out a set of choices and picks the one marked in the
   * markup, `move` and `click` drive the pointer, and `state` flips the group into a
   * named phase the stylesheet animates off.
   * @param {HTMLElement} step
   * @param {Group} group
   * @param {number} token
   * @returns {Promise<boolean>} false if the run was superseded
   */
  async function playStep(step, group, token) {
    switch (step.dataset.vpmStep) {
      case 'show': {
        if (!(await wait(BEAT.beforeReply, token))) return false;

        step.classList.add('is-in');
        keepInView(step, true);

        return wait(BEAT.afterReply, token);
      }

      case 'reveal': {
        const items = /** @type {HTMLElement[]} */ ([...step.children]);

        step.classList.add('is-in');

        for (const [i, item] of items.entries()) {
          setTimeout(() => {
            if (token === generation) {
              item.classList.add('is-in');
              keepInView(item, true);
            }
          }, i * BEAT.optionStagger);
        }

        if (!(await wait(items.length * BEAT.optionStagger + BEAT.beforePick, token))) return false;

        step.querySelector('[data-vpm-pick]')?.classList.add('is-picked');

        return wait(BEAT.afterPick, token);
      }

      case 'move': {
        const cursor = group.el.querySelector('[data-vpm-cursor]');
        const target = group.el.querySelector(`[data-vpm-target="${step.dataset.vpmTo}"]`);

        if (!(cursor instanceof HTMLElement) || !(target instanceof HTMLElement)) return true;

        const host = /** @type {HTMLElement} */ (cursor.offsetParent ?? cursor.parentElement);
        const to = target.getBoundingClientRect();
        const from = host.getBoundingClientRect();

        cursor.style.transform = `translate(${to.left - from.left + to.width / 2}px, ${
          to.top - from.top + to.height / 2
        }px)`;

        return wait(BEAT.move, token);
      }

      case 'click': {
        const cursor = group.el.querySelector('[data-vpm-cursor]');
        const target = group.el.querySelector(`[data-vpm-target="${step.dataset.vpmTo}"]`);

        cursor?.classList.add('is-clicking');
        target?.classList.add('is-pressed');

        const alive = await wait(BEAT.click, token);

        cursor?.classList.remove('is-clicking');
        target?.classList.remove('is-pressed');

        return alive;
      }

      case 'state': {
        group.el.dataset.phase = step.dataset.vpmState ?? 'idle';

        return wait(Number(step.dataset.vpmHold) || BEAT.afterReply, token);
      }

      default: {
        step.classList.add('is-in', 'is-typing');

        const done = await type(step, texts.get(step) ?? '', group.cps, token);

        step.classList.remove('is-typing');

        return done;
      }
    }
  }

  /**
   * Puts the pointer back where it starts, just below the composer, without letting
   * it glide there in front of the shopper.
   * @param {Group} group
   */
  function parkCursor(group) {
    const cursor = group.el.querySelector('[data-vpm-cursor]');

    if (!(cursor instanceof HTMLElement)) return;

    const host = /** @type {HTMLElement} */ (cursor.offsetParent ?? cursor.parentElement);

    cursor.style.transition = 'none';
    cursor.style.transform = `translate(${host.clientWidth * 0.5}px, ${host.clientHeight + 16}px)`;
    void cursor.offsetWidth;
    cursor.style.transition = '';
  }

  /**
   * Scrolls the slide just enough to keep an element on screen. During typing this
   * runs every frame, so it moves instantly there; between steps it eases.
   * @param {HTMLElement} el
   * @param {boolean} [smooth]
   */
  function keepInView(el, smooth = false) {
    const slide = /** @type {HTMLElement | null} */ (el.closest('.vpm-slide'));

    if (!slide) return;

    const overflow = el.getBoundingClientRect().bottom - slide.getBoundingClientRect().bottom;

    if (overflow > 0) slide.scrollBy({ top: overflow + 12, behavior: smooth ? 'smooth' : 'auto' });
  }

  /**
   * @param {HTMLElement} el
   * @param {string} text
   * @param {number} cps characters per second
   * @param {number} token
   * @returns {Promise<boolean>} false if the run was superseded
   */
  function type(el, text, cps, token) {
    return new Promise((resolve) => {
      let start = 0;

      const step = (/** @type {number} */ now) => {
        if (token !== generation) return resolve(false);
        if (!start) start = now;

        const shown = Math.floor(((now - start) / 1000) * cps);

        el.textContent = text.slice(0, shown);
        keepInView(el);

        if (shown < text.length) requestAnimationFrame(step);
        else resolve(true);
      };

      requestAnimationFrame(step);
    });
  }

  /**
   * @param {number} ms
   * @param {number} token
   * @returns {Promise<boolean>} false if the run was superseded
   */
  function wait(ms, token) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(token === generation), ms);
    });
  }

  /* --------------------------------------------------------------- modal */

  function open() {
    restoreFocusTo = /** @type {HTMLElement | null} */ (document.activeElement);
    document.documentElement.style.overflow = 'hidden';

    if (typeof root.showModal === 'function') root.showModal();
    else {
      root.setAttribute('open', '');
      root.classList.add('vpm--fallback');
    }

    // Start on slide one every time, without animating the jump back, and let the
    // modal drive again however the last opening ended.
    auto = true;
    index = -1;
    goTo(0, false);
    root.querySelector('[data-vpm-close]')?.focus({ preventScroll: true });
  }

  function close() {
    // Where the dialog is native, closing it fires `close`, which does the cleanup.
    // Escape reaches that same path without coming through here.
    if (typeof root.close === 'function' && root.open) {
      root.close();
      return;
    }

    root.removeAttribute('open');
    root.classList.remove('vpm--fallback');
    cleanUp();
  }

  function cleanUp() {
    generation += 1;
    document.documentElement.style.overflow = '';
    restoreFocusTo?.focus?.({ preventScroll: true });
  }

  root.addEventListener('close', cleanUp);

  // Clicking the backdrop lands on the dialog itself, since the sheet fills only
  // part of it.
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });

  root.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;

    takeOver();
    goTo(event.key === 'ArrowRight' ? index + 1 : index - 1);
  });

  for (const button of root.querySelectorAll('[data-vpm-close]')) {
    button.addEventListener('click', close);
  }

  // A hand on the track is the shopper steering, whether it turns into a swipe or
  // not. The scroll event itself cannot say that, since the modal's own hand-off
  // scrolls the track too.
  for (const type of ['pointerdown', 'wheel']) {
    track.addEventListener(type, takeOver, { passive: true });
  }

  prev.addEventListener('click', () => {
    takeOver();
    goTo(index - 1);
  });

  next.addEventListener('click', () => {
    takeOver();
    goTo(index + 1);
  });

  dots.forEach((dot, i) =>
    dot.addEventListener('click', () => {
      takeOver();
      goTo(i);
    })
  );

  replay?.addEventListener('click', () => {
    takeOver();
    play(slides.findIndex((slide) => slide.contains(demo)));
  });

  // Sizes change with the viewport, so the scroll offset has to be recomputed or
  // the track lands between two slides.
  window.addEventListener('resize', () => goTo(index, false));

  slides.forEach((slide, i) => {
    slide.toggleAttribute('inert', i !== 0);
    slide.classList.toggle('is-active', i === 0);
  });
  prev.disabled = true;

  inject();
  new MutationObserver(scheduleInject).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('shopify:section:load', scheduleInject);
}

/**
 * Strips the indentation the answers pick up from being written inside the
 * snippet, so the typing does not spend time on invisible whitespace.
 * @param {string} text
 * @returns {string}
 */
function normalise(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}
