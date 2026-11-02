These constants control **how the animations move and settle**. Your code simulates a spring pulling each animated value toward a target.

```js
// Animation State
  const animState = {
    buttonHovers: [],
    buttonActive: [],
    opacity: 0,
    hoveredButtonIndex: -1,
    scale: 0.5,
  };
  const springs = {
    opacity: { val: 0, vel: 0 },
    scale: { val: 0.5, vel: 0 },
    buttons: [],
  };
  const SPRING_STIFFNESS = 280;
  const SPRING_DAMPING = 22;
  const HOVER_STIFFNESS = 320;
  const HOVER_DAMPING = 26;
  let lastTime = null;
  function stepSpring(spring, target, stiffness, damping, dt) {
    const force = -stiffness * (spring.val - target);
    const dampen = -damping * spring.vel;
    spring.vel += (force + dampen) * dt;
    spring.val += spring.vel * dt;
    if (Math.abs(spring.val - target) < 0.001 && Math.abs(spring.vel) < 0.001) {
      spring.val = target;
      spring.vel = 0;
    }
  }
```

| Constant | Purpose | Effect Of Increasing It |
|---|---|---|
| `SPRING_STIFFNESS = 280` | Pulls the toast’s opacity and scale toward their targets when appearing or disappearing. | Stronger pull; quicker movement, potentially more bounce. |
| `SPRING_DAMPING = 22` | Resists movement during those toast animations. | Less bounce; too much can make movement sluggish. |
| `HOVER_STIFFNESS = 320` | Pulls each button’s hover animation toward hovered (`1`) or unhovered (`0`). | More immediate hover feedback. |
| `HOVER_DAMPING = 26` | Resists movement during the button animations. | Less hover bounce and oscillation. |

Think of **stiffness as spring strength** and **damping as friction**.

In [`stepSpring()`](C:/Users/drewg/bin/exe/.extensions/toast/content.js:43), those two effects are calculated as:

```javascript
const force = -stiffness * (spring.val - target)
const dampen = -damping * spring.vel
```

`force` pulls toward the target based on how far away the value is. `dampen` opposes its current velocity, preventing it from bouncing indefinitely. The function then updates velocity and value using the elapsed time, `dt`.

In your specific implementation:

- The toast opens from scale `0.8` toward `1`, while opacity moves from `0` toward `1`.
- Hover progress controls button enlargement, background highlighting, icon lift, and brightness.
- Pressed buttons reuse the hover constants with multipliers: stiffness becomes `480` and damping becomes `31.2`, giving clicks a firmer response. See [`updateState()`](C:/Users/drewg/bin/exe/.extensions/toast/content.js:490).

These values **aren’t durations or animation sizes**. For example, `hoverScale: 1.15` determines how large a hovered button becomes; the spring constants determine how it gets there.
