/* ───────────────────────────── GLOBAL STATE ───────────────────────────── */
const state = {
    scene: 0,               // which <section> is active
    yearFilter: [1995, 2024],
    methodFilter: new Set(),
    hoverPlanet: null
  };
  
  /* ───────────────────────────── DATA LOAD ─────────────────────────────── */
  let exoplanets;           // will hold parsed CSV rows
  d3.csv("data/exoplanets.csv", d => ({
    name: d.pl_name,
    year: +d.disc_year,
    radius: +d.pl_rade,     // Earth radii
    method: d.discoverymethod
  })).then(data => {
    exoplanets = data.filter(d => d.radius);  // drop missing values
    initScroll();          // kickoff after data ready
  });
  
  /* ───────────────────────────── SCROLL HANDLER ────────────────────────── */
  function initScroll() {
    const steps = d3.selectAll(".step");
  
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          state.scene = +entry.target.dataset.scene;
          render();
        }
      });
    }, { threshold: 0.5 });
  
    steps.each(function () { io.observe(this); });
  }
  
  /* ───────────────────────────── RENDER LOOP ───────────────────────────── */
  const svg   = d3.select("#chart");
  const gRoot = svg.append("g");
  
  function render() {
    // Wipe previous scene
    gRoot.selectAll("*").remove();
  
    switch (state.scene) {
      case 0: return scene0();
      case 1: return scene1();
      case 2: return scene2();
      case 3: return scene3();
      case 4: return scene4();
    }
  }
  
  /* ──────────────── SCENE FUNCTIONS (stubbed for now) ─────────────── */
  function scene0() {
    gRoot.append("text")
         .attr("x", "50%")
         .attr("y", "50%")
         .attr("text-anchor", "middle")
         .attr("fill", "white")
         .style("font-size", "36px")
         .text("1995: 51 Peg b discovered");
    // Later: draw big textured planet vs tiny Earth icon
  }
  
  function scene1() {
    /* Timeline line-chart prototype */
    const margin = {top:40,right:20,bottom:50,left:60},
          width  = +svg.attr("width")  - margin.left - margin.right,
          height = +svg.attr("height") - margin.top  - margin.bottom,
          g      = gRoot.append("g").attr("transform",`translate(${margin.left},${margin.top})`);
  
    const x = d3.scaleLinear()
                .domain(d3.extent(exoplanets, d => d.year))
                .range([0, width]);
  
    const y = d3.scaleLinear()
                .domain([0, d3.max(exoplanets, d => d.radius)])
                .range([height, 0]);
  
    /* yearly average radius */
    const yearly = d3.rollups(
      exoplanets,
      v => d3.mean(v, d => d.radius),
      d => d.year
    ).map(([year, avg]) => ({year, avg})).sort((a,b) => a.year-b.year);
  
    const line = d3.line()
                   .x(d => x(d.year))
                   .y(d => y(d.avg))
                   .curve(d3.curveMonotoneX);
  
    g.append("path")
      .datum(yearly)
      .attr("fill","none")
      .attr("stroke","#9fd3ff")
      .attr("stroke-width",3)
      .attr("d", line);
  
    /* axes */
    g.append("g").attr("class","axis x")
      .attr("transform",`translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")));
    g.append("g").attr("class","axis y")
      .call(d3.axisLeft(y));
  
    /* annotations */
    const ann = [
      { note: { title: "Average radius: 14 R⊕", label: "1995" },
        x: x(1995), y: y(yearly.find(d=>d.year===1995).avg), dx: -80, dy: -40 },
      { note: { title: "Average radius: 2 R⊕", label: "2024" },
        x: x(2024), y: y(yearly.find(d=>d.year===2024).avg), dx: 30, dy: -50 }
    ];
    d3.annotation().annotations(ann)(g);
  }
  
  function scene2() { /* ridgeline histogram later */ }
  function scene3() { /* scatter radius vs year, color=method */ }
  function scene4() { /* free-explore interactive scatter */ }
  
  /* ───────────────────────────── TOOLTIP HANDLERS (for later) ─────────── */
  const tooltip = d3.select("#tooltip");
  
  function showTooltip(html, [x,y]) {
    tooltip.html(html).style("left",`${x+10}px`).style("top",`${y+10}px`).attr("hidden",null);
  }
  function hideTooltip() { tooltip.attr("hidden",true); }
  