const url = "https://raw.githubusercontent.com/freeCodeCamp/ProjectReferenceData/master/global-temperature.json";
let svg, tip;

d3.json(url)
  .then(data => createHeatMap(data))
  .catch(err => console.log(err));

const createHeatMap = (data) => {
  const width = 5 * Math.ceil((data.monthlyVariance.length / 12)); //pixels by years
  const height = 35 * 12; //pixels by months
  const fontSize = 16;
  const padding = {
    left: 9 * fontSize,
    right: 9 * fontSize,
    top: 1 * fontSize,
    bottom: 8 * fontSize
  };
  data.monthlyVariance.forEach((val) => val.month -= 1) //Adjust months to zero-index
  
  //Create title and description
  d3.select("section")
    .append("h1")
    .attr("id", "title")
    .text("Monthly Global Land-Surface Temperature")
    .append("h6")
    .attr("id", "description")
    .html(
      "From " +
      data.monthlyVariance[0].year +
      " to " +
      data.monthlyVariance[data.monthlyVariance.length - 1].year +
      ", base temperature " +
      data.baseTemperature +
      "°C."
    )

  //Create tooltip using d3-tip
    tip = d3
    .tip()
    .attr("class", "d3-tip")
    .attr("id", "tooltip")
    .html((d) => d)
    .direction("e")
    .offset([-20, 0]);
  
  //Create canvas
  svg = d3
    .select("section")
    .append("svg")
    .attr("width", width + padding.left + padding.right)
    .attr("height", height + padding.top + padding.bottom)
    .attr("class", "svg")
  .call(tip);

  //Create graph
  //Y axis:
  const yScale = d3
    .scaleBand()
    .domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    .rangeRound([0, height])
    .padding(0);
  
  const yAxis = d3
    .axisLeft()
    .scale(yScale)
    .tickValues(yScale.domain())
    .tickFormat((month) => {
      const date = new Date(0);
      date.setUTCMonth(month);
      const format = d3.utcFormat("%B");
      return format(date);
    })
  
  svg
    .append("g")
    .attr("class", "y-axis")
    .attr("id", "y-axis")
    .attr("transform", "translate(" + padding.left + "," + padding.top + ")")
    .call(yAxis)
  
  //X axis:
  const xScale = d3
    .scaleBand()
    .domain(data.monthlyVariance.map((val) => val.year))
    .range([0, width])
    .padding(0)
  
  const xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickValues(xScale.domain().filter((year) => year % 10 === 0)) //Only show decades on ticks
    .tickFormat((year) => {
      const date = new Date(0);
      date.setUTCFullYear(year);
      const format = d3.utcFormat("%Y");
      return format(date);      
    })
  
  svg
    .append("g")
    .attr("class", "x-axis")
    .attr("id", "x-axis")
    .attr("transform", "translate(" + padding.left + "," + (height + padding.top) + ")")
    .call(xAxis)
  
  //Legend, based on Mike Bostock's Threshold Key:
  //https://gist.github.com/mbostock/4573883
  const legendColors = [
    "#313695",
    "#4575b4",
    "#74add1",
    "#abd9e9",
    "#e0f3f8",
    "#ffffbf",
    "#fee090",
    "#fdae61",
    "#f46d43",
    "#d73027",
    "#a50026"
  ];
  const legendWidth = 400;
  const legendHeight = 300 / legendColors.length;
  const variance = data.monthlyVariance.map((val) => val.variance);
  const minTemp = data.baseTemperature + Math.min.apply(null, variance);
  const maxTemp = data.baseTemperature + Math.max.apply(null, variance);
  
  const legendThreshold = d3
    .scaleThreshold()
    .domain(
      (function (min, max, count) {
        const array = [];
        const step = (max - min) / count;
        const base = min;
        for (let i = 1; i < count; i++) {
          array.push(base + i * step);
        }
        return array;
      })(minTemp, maxTemp, legendColors.length)
    )
    .range(legendColors);
  
  const legendXScale = d3
    .scaleLinear()
    .domain([minTemp, maxTemp])
    .range([0, legendWidth]);
  
  const legendXAxis = d3
    .axisBottom()
    .scale(legendXScale)
    .tickValues(legendThreshold.domain())
    .tickFormat(d3.format(".1f")) //to show decimals

  const legend = svg
    .append("g")
    .attr("class", "legend")
    .attr("id", "legend")
    .attr("transform", "translate(" + padding.left + "," +
          (padding.top + height + padding.bottom - 2 * legendHeight) + ")");
  
  legend
    .append("g")
    .selectAll("rect")
    .data(
      legendThreshold.range().map((color) => {
        let d = legendThreshold.invertExtent(color);
        if (d[0] === null) {
          d[0] = legendXScale.domain()[0];
        }
        if (d[1] === null) {
          d[1] = legendXScale.domain()[1];
        }
        return d;
      })
    )
    .enter()
    .append("rect")
    .style("fill", (d) => legendThreshold(d[0]))
    .attr("x", (d) => legendXScale(d[0]))
    .attr("y", 0)
    .attr("width", (d) => d[0] && d[1] ? legendXScale(d[1]) - legendXScale(d[0]) : legendXScale(null))
    .attr("height", legendHeight)
  
  legend
    .append("g")
    .attr("transform", "translate(0," + legendHeight + ")")
    .call(legendXAxis)
  
  //Heat map graph:
  svg
    .append("g")
    .attr("class", "map")
    .attr("transform", "translate(" + padding.left + "," + padding.top + ")")
    .selectAll("rect")
    .data(data.monthlyVariance)
    .enter()
    .append("rect")
    .attr("class", "cell")
    .attr("data-month", (d) => d.month)
    .attr("data-year", (d) => d.year)
    .attr("data-temp", (d) => data.baseTemperature + d.variance)
    .attr("x", (d) => xScale(d.year))
    .attr("y", (d) => yScale(d.month))
    .attr("width", (d) => xScale.bandwidth(d.year))
    .attr("height", (d) => yScale.bandwidth(d.month))
    .attr("fill", (d) => legendThreshold(data.baseTemperature + d.variance))
    .on("mouseover", function (event, d) {
      var date = new Date(d.year, d.month);
      var str =
        "<span class='date'>" +
        d3.utcFormat("%Y - %B")(date) +
        "</span>" +
        "<br/>" +
        "<span class='temperature'>" +
        d3.format(".1f")(data.baseTemperature + d.variance) +
        " °C" +
        "</span>" +
        "<br/>" +
        "<span class='variance'>" +
        d3.format("+.1f")(d.variance) +
        " °C" +
        "</span>";
      tip.attr("data-year", d.year);
      tip.show(str, this);
    })
    .on("mouseout", tip.hide);
};
