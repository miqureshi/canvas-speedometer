// Original code shared in the public domain on the 'net by <anonymous>
// Further work by vjt@openssl.it - http://sindro.me/
//
// Project home page: http://github.com/vjt/canvas-speedometer
//
function Speedometer() {
  var options = arguments[0] || {};

  var Container = document.getElementById(
    options.element || 'speedometer'
  );

  if (!Container) throw ('No container found!'); // XXX

  // Customization
  var MinValue = options.min   || 0.0;
  var MaxValue = options.max   || 100.0;
  var CurValue = options.value || MinValue;

  // Threshold
  var Threshold   = options.threshold      || 50.0;
  var ThreshPivot = options.thresholdPivot || 35.0;

  // Meter, and correct user coords (cartesian) to the canvas std plane coords
  var MeterFromAngle = (options.meterFromAngle || -135.0) - 90.0;
  var MeterToAngle   = (options.meterToAngle   ||  135.0) - 90.0;
  var MeterRimAngle  = MeterToAngle - MeterFromAngle;

  // Correct given coords (cartesian) to the canvas std plane

  // Container CSS inspection to get computed size
  var ContainerStyle = TBE.GetElementComputedStyle (Container);
  var Size = Math.min (
    parseInt (ContainerStyle.width),
    parseInt (ContainerStyle.height)
  );

  if (!Size) throw ('Cannot get container dimensions!');

  var x = Size * 0.05;
  var y = Size * 0.05;

  // Theming
  var theme = Speedometer.themes[options.theme] || Speedometer.themes['default'];

  if (!Speedometer.themes['default'])
    throw ('Default theme missing! Please load themes/default.js');

  for (key in Speedometer.themes['default'])
    if (theme[key] == undefined)
      theme[key] = Speedometer.themes['default'][key];

  var Color = {
    dial  : theme.dial,
    rim   : theme.rim,
    rimArc: theme.rimArc,
    thresh: theme.thresh,
    center: theme.center,
    nose  : theme.nose,
    hand  : {
      main   : theme.hand,
      shine  : theme.handShine,
      shineTo: theme.handShineTo,
    },
    calib : {
      ticks  : theme.ticks,
      marks  : theme.marks,
      strings: theme.strings,
      font   : theme.font
    },
    digits: theme.digits
  };

  // Private stuff.
  //
  var Canvas = {
    background: TBE.CreateSquareCanvasElement (Size),
    foreground: TBE.CreateSquareCanvasElement (Size),
    hand      : TBE.CreateSquareCanvasElement (Size),
    digits    : TBE.CreateSquareCanvasElement (Size)
  };

  var Context = {
    background: TBE.GetElement2DContext (Canvas.background),
    foreground: TBE.GetElement2DContext (Canvas.foreground),
    hand      : TBE.GetElement2DContext (Canvas.hand)
  };

  var Display = new DigitalDisplay ({
    element: Canvas.digits,
    placeholders: Color.dial,
    digits: Color.digits,
    width: Size
  });

  // Now append the canvases into the given container
  //
  Container.appendChild (Canvas.background);
  Container.appendChild (Canvas.digits);
  Container.appendChild (Canvas.hand);
  Container.appendChild (Canvas.foreground);

  //
  // Initialization done!

  // Draw everything (still to be refactored)
  //
  this.draw = function ()
  {
    if (Context.background && Context.foreground && Context.hand)
    {
      var w = Size - x * 2;
      var h = Size - y * 2;

      this.drawBackground (x, y, w, h);
      this.drawHand ((w / 2) + x, (h / 2) + y);
      this.drawCenter ((w / 2) + x, (h / 2) + y);
      this.drawGloss ();

      Display.drawNumber (CurValue, 3, h / 1.2, Size / 9);
    }
  }

  this.update = function (value)
  {
    if (value > MaxValue || value < MinValue)
      return false;

    CurValue = value;

    if (Context.hand)
    {
      var w = Size - x * 2;
      var h = Size - y * 2;

      TBE.ClearCanvas (Canvas.hand);
      this.drawHand ((w / 2) + x, (h / 2) + y);
    }

    if (Display)
    {
      Display.clear ();
      Display.drawNumber (CurValue, 3, h / 1.2, Size / 9);
    }

    return true;
  }

  /* XXX TODO
  var step, FPS = 30;
  this.animatedUpdate = function (value, time)
  {
    if (value < MinValue || value > MaxValue || value == CurValue ||  time <= 0.0)
      return false;

    step = Math.abs (value - CurValue) / FPS
  }
  */

  this.value = function ()
  {
    return CurValue;
  }

  this.min = function ()
  {
    return MinValue;
  }

  this.max = function ()
  {
    return MaxValue;
  }

  var ticksCount = 10;
  var smallTicksCount = 3;
  var glossinessAlpha = 25 / 255.0;

  this.drawMeter = function (cx, cy)
  {
    var context = Context.background;

    var gap = (Size * 0.02);
    var shift = Size / 25;

    var radius = (Size - gap) / 2 - gap * 5;
    var totalAngle = MeterToAngle - MeterFromAngle;

    var currentAngle, angleIncr;
    var rulerValue = MinValue;

    function drawMark (angle, options)
    {
      var x0 = (cx + radius * Math.cos (angle));
      var y0 = (cy + radius * Math.sin (angle));
      var x1 = (cx + (radius - options.size) * Math.cos (angle));
      var y1 = (cy + (radius - options.size) * Math.sin (angle));

      context.strokeStyle = options.color;
      context.lineWidth = options.width;
      context.moveTo (x0, y0);
      context.lineTo (x1, y1);
    }

    function drawString (value, options)
    {
      // Draw Strings
      tx = cx + (radius - options.offset) * Math.cos (options.angle);
      ty = cy + gap / 2 + (radius - options.offset) * Math.sin (options.angle);

      context.fillStyle = options.color;
      context.textAlign = 'center';

      context.font = Math.round (options.size) + 'pt ' + Color.calib.font;
      context.textAlignment = 'center';
      context.fillText (value, tx, ty);
    }

    angleIncr = TBE.Deg2Rad (totalAngle / ticksCount);
    currentAngle = TBE.Deg2Rad (MeterFromAngle);
    context.beginPath ();
    for (i = 0; i <= ticksCount; i++)
    {
      // Draw thick mark and increment angle
      drawMark (currentAngle, {size: Size / 20, width: Size / 50, color: Color.calib.ticks});

      // Draw string and increment ruler value
      drawString (rulerValue, {angle: currentAngle, color: Color.calib.strings, offset: Size / 10, size: Size / 23});

      currentAngle += angleIncr;
      rulerValue = Math.round (rulerValue + ((MaxValue - MinValue) / ticksCount));
    }
    context.stroke ();

    angleIncr = TBE.Deg2Rad (totalAngle / ticksCount / (smallTicksCount + 1));
    currentAngle = TBE.Deg2Rad (MeterFromAngle);
    context.beginPath ();
    for (i = 0; i < (smallTicksCount + 1) * ticksCount; i++)
    {
      // Draw thin mark if not overlapping a thick mark
      if (i % (smallTicksCount + 1) != 0)
        drawMark (currentAngle, {size: Size / 50, width: Size / 100, color: Color.calib.marks});

      currentAngle += angleIncr;
    }
    context.stroke ();
  }

  this.drawGloss = function ()
  {
    var context = Context.foreground;

    var rX = Size * 0.15;
    var rY = y + Size * 0.07;
    var rW = Size * 0.70;
    var rH = Size * 0.65;

    var g1 = context.createLinearGradient (0, 0, 0, rY+rH);
    g1.addColorStop (0, 'rgba(255,255,255,1.0)');
    g1.addColorStop (1, 'rgba(255,255,255, 0.0)');

    context.fillStyle = g1;
    context.fillEllipse (rX, rY, rW, rH);

    rX = Size * 0.30;
    rY = y + Size * 0.70;
    rW = Size * 0.40;
    rH = Size * 0.15;

    var g2 = context.createLinearGradient (0, rY, 0, rY + rH);
    g2.addColorStop (0, 'rgba(255,255,255,0.0)');
    g2.addColorStop (0.25, 'rgba(255,255,255,0.0)');
    g2.addColorStop (1, 'rgba(255,255,255,1.0)');

    context.fillStyle = g2;
    context.fillEllipse (rX, rY, rW, rH);
  }

  this.drawCenter = function (cx, cy)
  {
    var context = Context.foreground;

    var shift = Size / 5;

    var rX = cx - (shift / 2);
    var rY = cy - (shift / 2);
    var rW = shift;
    var rH = shift;

    var g1 = context.createLinearGradient (0, rY, 0, rY + rH);
    g1.addColorStop (0, Color.center);
    g1.addColorStop (0.5, Color.center);
    g1.addColorStop (1, Color.dial);

    context.fillStyle = g1;
    context.fillEllipse (rX, rY, rW, rH);

    shift = Size / 7;

    rX = cx - (shift / 2);
    rY = cy - (shift / 2);
    rW = shift;
    rH = shift;

    var g2 = context.createLinearGradient (rX, rY, rW + rX, rY + rH);
    g2.addColorStop (0, Color.nose);
    g2.addColorStop (1, Color.center);

    context.fillStyle = g2;
    context.fillEllipse (rX, rY, rW, rH);
  }

  this.drawHand = function (cx, cy)
  {
    var context = Context.hand;

    var radius = Size / 2 - (Size * 0.12);
    var val = MaxValue - MinValue;

    val = (MaxValue * (CurValue - MinValue)) / val;
    val = ((MeterToAngle - MeterFromAngle) * val) / MaxValue;
    val += MeterFromAngle;

    var angle = TBE.Deg2Rad (val);
    var gradientAngle = angle;

    // Fill Polygon
    var pts = new Array(5 * 2);

    pts[0*2+0] = cx + radius * Math.cos (angle);
    pts[0*2+1] = cy + radius * Math.sin (angle);

    pts[4*2+0] = cx + radius * Math.cos (angle - 0.02);
    pts[4*2+1] = cy + radius * Math.sin (angle - 0.02);

    angle = TBE.Deg2Rad (val + 20);
    pts[1*2+0] = cx + (Size * 0.09) * Math.cos (angle);
    pts[1*2+1] = cy + (Size * 0.09) * Math.sin (angle);

    pts[2*2+0] = cx;
    pts[2*2+1] = cy;

    angle = TBE.Deg2Rad (val - 20);
    pts[3*2+0] = cx + (Size * 0.09) * Math.cos (angle);
    pts[3*2+1] = cy + (Size * 0.09) * Math.sin (angle);

    context.fillStyle = Color.hand.main;
    context.fillPolygon (pts);

    // Draw Shine
    pts = new Array (3 * 2);

    angle = TBE.Deg2Rad (val);
    pts[0*2+0] = cx + radius * Math.cos (angle);
    pts[0*2+1] = cy + radius * Math.sin (angle);

    angle = TBE.Deg2Rad (val + 20);
    pts[1*2+0] = cx + (Size * 0.09) * Math.cos (angle);
    pts[1*2+1] = cy + (Size * 0.09) * Math.sin (angle);

    pts[2*2+0] = cx;
    pts[2*2+1] = cy;

    var g1 = context.createLinearGradient (0, 0, cx, cy);
    g1.addColorStop (0, Color.hand.shine);
    g1.addColorStop (1, Color.hand.shineTo);

    context.fillStyle = g1;
    context.fillPolygon (pts);
  }

  this.drawBackground = function (x, y, w, h)
  {
    var context = Context.background;

    // Draw background color
    context.fillStyle = Color.dial;
    context.ellipse (x, y, w, h);
    context.globalAlpha = 120.0 / 255.0;
    context.fill ();

    // Draw Rim
    context.strokeStyle = Color.rim;
    context.lineWidth = w * 0.03;
    context.ellipse (x, y, w, h);
    context.globalAlpha = 1.0;
    context.stroke ();

    this.drawMeter ((w / 2) + x, (h / 2) + y);

    // Draw Colored Rim
    context.strokeStyle = Color.rimArc;
    context.lineWidth = Size / 40;
    var gap = Size * 0.03;

    context.strokeBoxedArc (x + gap, y + gap, w - gap * 2, h - gap * 2,
                            TBE.Deg2Rad (MeterFromAngle), TBE.Deg2Rad (MeterRimAngle),
                            /* counterclockwise = */ false);

    // Draw Threshold
    context.strokeStyle = Color.thresh;
    context.lineWidth = Size / 50;
    // context.globalAlpha = 200.0 / 255.0;

    var val = MaxValue - MinValue
    val = (MaxValue * (ThreshPivot - MinValue)) / val; // recommendval - min
    val = ((MeterToAngle - MeterFromAngle) * val) / MaxValue;
    val += MeterFromAngle;
    var stAngle = val - ((MeterRimAngle * Threshold) / MaxValue / 2);
    if (stAngle <= MeterFromAngle)
      stAngle = MeterFromAngle;
    var sweepAngle = ((MeterRimAngle * Threshold) / MaxValue);
    if (stAngle + sweepAngle > MeterToAngle)
      sweepAngle = MeterToAngle - stAngle;

    context.strokeBoxedArc (x + gap, y + gap, w - gap * 2, h - gap * 2,
                            TBE.Deg2Rad (stAngle), TBE.Deg2Rad (sweepAngle),
                            /* counterclockwise = */ false);
  }
}; // End of class

// Theming support
Speedometer.themes = {};
