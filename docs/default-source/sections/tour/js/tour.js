const urlParams = new URLSearchParams(window.location.search);

const fall2025InitiativeData = window.location.origin + "/docs/default-source/sections/tour/data/Initiatives.csv?121437841";
const excludeProgressShortnames = ['CECTurnout', 'CECCandidate','plci','PKSeats','3KSeats'];
const dontDisplayGraphIn = ['CommunitySchools','SafePassage','ChronicAbsenteeism','CECTurnout','CECCandidate','PLCI','NYCReads','NYCSolves','STHCoordinators','PKSeats','3KSeats','ToddlerSeats','InfantSeats'];

getSOOSDetails();

function getSOOSDetails() {

    fetch(fall2025InitiativeData)
    .then(response => response.text())
    .then(csvData => {
        const initiativesDetails = Papa.parse(csvData, { header: true }).data; 
        wellnessInitiatives = initiativesDetails.filter(row => row.Commitment.trim() === "Ensuring Wellness");
        famEmpowerInitiatives = initiativesDetails.filter(row => row.Commitment.trim() === "Family Empowerment");
        teachPrepEmpowerInitiatives = initiativesDetails.filter(row => row.Commitment.trim() === "Teacher Prep");

        generateInitiatives('ensuring-wellness', wellnessInitiatives);
        generateInitiatives('family-empowerment', famEmpowerInitiatives);
        generateInitiatives('teacher-prep', teachPrepEmpowerInitiatives);
        
    })
    .catch(error => console.error("Error fetching CSV:", error));
}

function generateInitiatives(initiativesClass, initiatives) {
    let container = document.querySelector(`.${initiativesClass}`);
    let template = container.querySelector(".initiative-box");

    container.innerHTML = "";

    initiatives.forEach(initiative => {
        let box = template.cloneNode(true);
        let [focusText, focusNumber] = (initiative.Metric.trim() || "").split("|").map(s => s.trim());
        let collapseId = "initiative_" + initiative.ShortName.trim();
        let link = box.querySelector("a.icon-link");

        box.querySelector(".initiative-title a span").textContent = initiative.Initiative.trim();
        box.querySelector(".focus-text").textContent = focusText || "";
        box.querySelector(".focus-number").textContent = focusNumber || "";
        box.querySelector(".initiative-desc").textContent = initiative.Description.trim() || "";
        box.querySelector(".table-content-desc").textContent = initiative.DistrictTableName.trim() || "";
        
        link.setAttribute("data-bs-target", "#" + collapseId);
        link.setAttribute("data-shortname", initiative.ShortName.trim());
        link.setAttribute("data-staticdynamic", initiative.StaticvsDynamic.trim());
        link.setAttribute("aria-controls", collapseId);

        let collapseEl = box.querySelector(".collapse");
        collapseEl.setAttribute("id", collapseId);

        container.appendChild(box);
    });
}

document.addEventListener("shown.bs.collapse", function (event) {
    let collapseEl = event.target;
    let link = collapseEl.closest(".initiative-box").querySelector("a.icon-link");
    let shortName = link.getAttribute("data-shortname");
    let staticdynamic = link.getAttribute("data-staticdynamic");

    if (collapseEl.querySelector(".initiative-table-data") && collapseEl.querySelector(".initiative-table-data").innerHTML.trim() === "") {
        loadInitiativeDetails(shortName, collapseEl, staticdynamic);
    }
});

function loadInitiativeDetails(shortName, collapseEl, staticdynamic) {
    // Construct file path based on shortName
    let csvPath = window.location.origin + `/docs/default-source/sections/tour/data/${shortName}.csv?525114`; // adjust path if needed

    fetch(csvPath)
        .then(response => response.text())
        .then(csvData => {
            const parsed = Papa.parse(csvData, { header: false }).data;
            let displayProgressDiv = $(collapseEl).find(".display-progress");
            let table = document.createElement("table");
            table.className = "table table-bordered table-hover k-table mb-0";

            if (parsed[1][1] == "" && parsed[1][2] == "" && parsed[1][3] == "") {
                displayProgressDiv.parent().remove();
                $(collapseEl).find(".table-content-desc").html("");
                return false;
            }

            if (staticdynamic == "Dynamic") {
                if (!dontDisplayGraphIn.includes(shortName)) {
                    displayDynamicProgress([parsed[0], parsed[1]], collapseEl);
                } else {
                    displayProgressDiv.parent().remove();
                }
                
            } else if (staticdynamic == "Static") {
                if (!dontDisplayGraphIn.includes(shortName)) {
                    displayStaticAchievement([parsed[0], parsed[1]], collapseEl);
                } else {
                    displayProgressDiv.parent().remove();
                }
            } else if (staticdynamic == "DynamicTarget") {
                if (!dontDisplayGraphIn.includes(shortName)) {
                    displayDynamicTarget([parsed[0], parsed[1]], collapseEl);
                } else {
                    displayProgressDiv.parent().remove();
                }
            }

            if (parsed.length > 0) {
                // First row = table head
                let thead = document.createElement("thead");
                thead.className = "thead-backup";
                let headRow = document.createElement("tr");
                parsed[0].forEach(cell => {
                    if (cell.trim()) {
                        let th = document.createElement("th");
                        th.textContent = cell.trim();
                        headRow.appendChild(th);
                    }
                });
                thead.appendChild(headRow);
                table.appendChild(thead);

                // Prepare case-insensitive exclude list for quick checks
                const excludedShortnames = excludeProgressShortnames.map(s => s.trim().toLowerCase());
                const shortNameKey = (shortName || "").trim().toLowerCase();

                // Rest of rows = table body
                let tbody = document.createElement("tbody");
                parsed.slice(1).forEach(row => {
                    // skip empty rows
                    if (row.some(cell => cell.trim())) {
                        let tr = document.createElement("tr");
                        
                        row.forEach((cell, idx) => {
                            let td = document.createElement("td");
                            td.textContent = cell.trim();
                            if (idx === parsed[0].length - 1 && !excludedShortnames.includes(shortNameKey)) {
                                if (staticdynamic === "Dynamic") {
                                    const initProgress = progressBar(td, cell.trim());
                                    if (initProgress === "Complete") {
                                        tr.classList.add("table-success");
                                    }
                                } else if (staticdynamic === "Static") {
                                    getGrowthWithIcon(td, cell.trim());
                                }
                            }

                            tr.appendChild(td);
                        });
                        tbody.appendChild(tr);
                    }
                });
                table.appendChild(tbody);
            }

            // Insert into collapse body
            let collapseBody = collapseEl.querySelector(".initiative-table-data") || collapseEl;
            collapseBody.innerHTML = ""; 
            collapseBody.appendChild(table);
        })
        .catch(error => console.error(`Error fetching ${shortName}.csv:`, error));
}

function noInitiativeDataMsg() {
    return "<div class='text-center'>We’re still collecting data for this initiative. Please check back soon.</div>"
}

function displayStaticAchievement(achievementData, collapseEl) {
    
    const achievHeader = achievementData[0];
    const achievVals = achievementData[1];
    const achievCategory = achievHeader.slice(1, achievHeader.length - 1);
    const achievSeriesData = achievVals.slice(1, achievVals.length - 1).map(x => Number(x));
    const achievLineWidth = 4;
    const displayProgressDiv = $(collapseEl).find(".display-progress");
    const maxAchievGraphValue = Math.max(...achievSeriesData);
    const roundUpValRange = maxAchievGraphValue >= 1000 ? 1000 : 100;
    const roundedAchiveGraphMax = Math.ceil(maxAchievGraphValue / roundUpValRange) * roundUpValRange;
    let achievColor = "#359980";
    let growthContainer = document.createElement("div");
    getGrowthWithIcon(growthContainer, achievementData[1][3]);

    if (growthContainer.querySelector(".trend-icon.text-warning") !== null) {
        achievColor = "#F2631C";
    } else if (growthContainer.querySelector(".trend-icon.text-secondary") !== null) {
        achievColor = "#a3aab3ff";
    }

    kendo.ui.progress(displayProgressDiv, true);
    let achievementHTML = `
        <div class="text-center mb-3">
            <div>${collapseEl.parentElement.querySelector(".focus-text").textContent} ${collapseEl.parentElement.querySelector(".focus-number").textContent}</div>
            <div class="h2 d-flex justify-content-center gap-2 mt-1"><div>${achievementData[0][3]}:</div> ${growthContainer.outerHTML}</div>
        </div>
        <div class="display-achievement-graph"></div>    
    `;

    displayProgressDiv.html(achievementHTML);

    $(collapseEl).find(".display-achievement-graph").kendoChart({
        // title: {
        //     text: collapseEl.parentElement.querySelector(".initiative-title a span").textContent,
        //     color: "#333"
        // },
        legend: {
            visible: false
        },
        seriesDefaults: {
            type: "column",
            style: "smooth",
            gap: 5,
            spacing: 5
        },
        series: [
            { 
                name: "Progress",
                data: achievSeriesData,
                color: achievColor,
                width: achievLineWidth,
                labels: {
                    visible: true,
                    format: "{0}",
                    background: "transparent",
                    color: "#333",
                    position: "top",
                    font: "20px"
                },
                markers: {
                    visible: true,
                    size: 20,
                    background: "#fff",
                    border: { color: achievColor, width: achievLineWidth }
                }
            }
        ],
        categoryAxis: {
            categories: achievCategory,
            narrowBand: false,
            justified: false,
            majorGridLines: {
                visible: true
            },
            labels: {
                rotation: 0
            }
        },
        valueAxis: {
            min: 0,
            max: roundedAchiveGraphMax,
            majorGridLines: {
                visible: true
            }
        },
        tooltip: {
            visible: true,
            template: "#=value# in #=category#"
        }
    });

    kendo.ui.progress(displayProgressDiv, false);
}

function displayDynamicProgress(progressData, collapseEl) {
    const seasons = ["Fall", "Winter", "Spring", "Summer"];
    const headers = progressData[0];
    const values = progressData[1];
    const target = Number(values[headers.indexOf("2025-26 Target")].toString().replace('%', '').trim());

    const currentSeasonText = progressData[0][progressData[0].length - 2];
    const currentSeasonNumber = progressData[1][progressData[1].length - 2].includes('%') ? "" : progressData[1][progressData[1].length - 2];
    const currentSeasonPercent = progressData[1][progressData[1].length - 1];

    let percent = parseInt(progressData[1][4], 10);
    let label = getProgressLabel(percent);
    let prevSeasonVal = 0;
    let segmentIndex = 0;
    const opacityStep = 0.35;
    let stackedProgressBars = "";
    let stackedBarsLegend = "";
    
    progressData[0].forEach((header, index) => {

        if (seasons.some(season => header.includes(season))) {
            const val = Number(values[index].toString().replace('%', '').trim());

            if (!isNaN(val)) {
                const increment = val - prevSeasonVal;
                prevSeasonVal = val;
                
                const progBarPercent = (increment / target) * 100;
                const totalPercent = (val / target) * 100;
                const stackBgOpacity = Math.max(1 - (opacityStep * segmentIndex), 0);

                const barStack = document.createElement("div");
                barStack.className = "progress bg-success";
                barStack.style.width = progBarPercent + "%";
                barStack.style.setProperty("--pws-bg-opacity", stackBgOpacity);

                barStack.setAttribute("role", "progressbar");
                barStack.setAttribute("aria-valuemin", "0");
                barStack.setAttribute("aria-valuemax", "100");
                barStack.setAttribute("aria-valuenow", progBarPercent.toFixed(0));

                stackedProgressBars += barStack.outerHTML;

                stackedBarsLegend += `
                    <div class="d-flex align-items-center gap-2">
                        <div class="bg-success" style="width:1rem; height:1rem; --pws-bg-opacity:${stackBgOpacity}"></div>
                        <div>${header}: ${totalPercent.toFixed(0)}%</div>
                    </div>
                `;

                segmentIndex++;
            }
        }
    });

    let progressBarHTML = `
    <div class="text-center mb-3">
        ${progressData[0][1]}: ${collapseEl.parentElement.querySelector(".focus-text").textContent} ${collapseEl.parentElement.querySelector(".focus-number").textContent}
        <div class="h2 mt-1">Progress &bull; ${currentSeasonText}</div>
    </div>
    <div class="">
        <div class="d-flex justify-content-between text-nowrap mb-1 gap-2 h4 fw-normal">
            <div>
                ${label.toLowerCase() === "complete" ? '<i class="fas fa-check-circle me-1" style="color:#33B44A"></i>' : ''}
                ${label}
            </div>
            <div>${currentSeasonNumber} (${currentSeasonPercent})</div>
        </div>
        <div class="progress-bar rounded-pill mb-3">
            <div class="progress-stacked">
                ${stackedProgressBars}
            </div>
        </div>
        <div class="d-flex flex-column flex-md-row gap-1 gap-md-5 text-muted justify-content-center" style="font-size:1rem;">
            ${stackedBarsLegend}
        </div>
    </div>`;
    $(collapseEl).find(".display-progress").html(progressBarHTML);
}

function displayDynamicTarget(targetData, collapseEl) {
    
    const seasons = ["Fall", "Winter", "Spring", "Summer"];
    const headers = targetData[0];
    const values = targetData[1];
    const target = Number(values[headers.indexOf("2025-26 Target")].toString().replace('%', '').trim());

    const currentSeasonText = targetData[0][targetData[0].length - 1];
    const currentAbsenceRate = targetData[1][targetData[1].length -1].toString().replace('%', '').trim();
    const lastYearAbsence = targetData[1][1].toString().replace('%', '').trim();
    const targetAbsenceRate = targetData[1][2].toString().replace('%', '').trim();
    const rateAbsenceChange = currentAbsenceRate - lastYearAbsence;
    
    let absenceColorNegative = "#359980";
    let absenceColorPositive = "#F2631C";
    let absenceRateColor = absenceColorNegative;
    let absenceLabel = ``;
    let absenceTrendIcon = ``;

    if (rateAbsenceChange < -3) {
        absenceLabel = `<i class="fa-solid fa-circle-check text-success"></i> On Target`;
        absenceTrendIcon = `<i class="fa-solid fa-arrow-trend-down text-success"></i>`;
    } else if (rateAbsenceChange == 0) {
        absenceLabel = `No Change`;
    } else if (rateAbsenceChange > 0) {
        absenceLabel = `<i class="fa-solid fa-circle-xmark text-warning"></i> Off Target`;
        absenceRateColor = absenceColorPositive;
        absenceTrendIcon = `<i class="fa-solid fa-arrow-trend-up text-warning"></i>`;
    } else {
        absenceLabel = `<i class="fa-regular fa-circle-check text-success opacity-75"></i> Making Progress`;
        absenceTrendIcon = `<i class="fa-solid fa-arrow-trend-down text-success opacity-75"></i>`;
    }

    let segmentIndex = 0;
    let stackedProgressBars = "";
    let stackedBarsLegend = "";
    
    targetData[0].forEach((header, index) => {

        if (seasons.some(season => header.includes(season))) {
            const val = Number(values[index].toString().replace('%', '').trim());
            console.log("Val:", val);
            if (!isNaN(val)) {
                const barStack = document.createElement("div");

                stackedProgressBars += barStack.outerHTML;

                stackedBarsLegend += `
                    <div class="d-flex align-items-center gap-2">
                        <div class="bg-success" style="width:1rem; height:1rem;"></div>
                        <div>${header}: ${val.toFixed(0)}%</div>
                    </div>
                `;

                segmentIndex++;
            }
        }
    });

    const displayProgressDiv = $(collapseEl).find(".display-progress");

    let dynamicTargetHTML = `
        <div class="text-center mb-3">
            ${targetData[0][2]}: ${collapseEl.parentElement.querySelector(".focus-text").textContent} ${collapseEl.parentElement.querySelector(".focus-number").textContent}
            <div class="h2 mt-1">Progress &bull; ${currentSeasonText}</div>
        </div>
        <div class="d-flex justify-content-between text-nowrap mb-1 gap-2 h4 fw-normal">
            <div>
                ${absenceLabel}
            </div>
            <div>${currentAbsenceRate}% (${rateAbsenceChange}%) &nbsp;${absenceTrendIcon}</div>
        </div>
        <div class="display-achievement-graph"></div>   
    `;
    

    displayProgressDiv.html(dynamicTargetHTML);

    $(collapseEl).find(".display-achievement-graph").kendoLinearGauge({
        gaugeArea: {
            margin: 0
        },
        pointer: {
            value: currentAbsenceRate,
            color: absenceRateColor,
            shape: "arrow",
            size: 20,
            margin: { top: 20 }
        },
        scale: {
            vertical: false,
            min: 0,
            max: 100,
            majorUnit: 10,
            majorTicks: {
                color: "#5d5d5dff",
                size: 20,
                visible: true
            },
            minorUnit: 1,
            minorTicks: {
                visible: true,
                color: "#b8b8b8ff",
                size: 15,
            },
            rangeSize: 10,
            // labels: {
            //     template: "#= value #% # if (value === 30) { # Last Years Rate # } #"
            // },
            ranges: [
                {
                    from: 0,
                    to: targetAbsenceRate,
                    color: absenceColorNegative,
                    opacity: 0.5
                }, {
                    from: targetAbsenceRate,
                    to: lastYearAbsence,
                    color: absenceColorNegative,
                    opacity: 0.35
                }, {
                    from: lastYearAbsence,
                    to: 100,
                    color: absenceColorPositive,
                    opacity: 0.5
                }
            ]
        }
    });
}

function progressBar(td, percentText) {
    let percentNum = parseInt(percentText.replace('%', '').trim(), 10);
    const percent = isNaN(percentNum) ? 0 : percentNum;

    const label = getProgressLabel(percent);
    const color = getProgressColor(percent);

    td.innerHTML = `
    <div class="">
        <div class="d-flex justify-content-between text-nowrap mb-1 gap-2" style="font-size:1rem;">
            <div>
                ${label.toLowerCase() === "complete" ? '<i class="fas fa-check-circle me-1" style="color:#33B44A"></i>' : ''}
                ${label}
            </div>
            <div>${percent}%</div>
        </div>
        <div class="progress-bar rounded-pill" role="progressbar" style="width:100%; height:8px" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar ${color}" style="width: ${percent}%; height:inherit"></div>
        </div>
    </div>`;
    return label;
}

function getProgressLabel(value) {
    if (value >= 100) return "Complete";
    if (value >= 90) return "Almost There";
    if (value >= 9) return "In Progress";
    if (value === 0) return "Off Track/Not Started";
    return "Just Started";
}

function getProgressColor(value) {
    if (value >= 100) return "bg-success"; // green
    if (value >= 85) return "bg-success bg-opacity-50"; // light green
    if (value >= 9) return "bg-success bg-opacity-50";   // yellow
    if (value === 0) return "bg-danger"; // red
    return "bg-danger bg-opacity-50";                    // dark red
}

function getGrowthWithIcon(td, growthValue) {

    if (!growthValue) return "";
    const match = growthValue.split(" (");
    const num = parseInt(match[0], 10);
    let icon = "";
    
    if (num > 0) {
        icon = `<span class="trend-icon text-success">
        <svg class="svg-icon" aria-label="Trend Arrow Up" role="img" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.5003 5.33301C17.565 5.33302 17.6299 5.33905 17.6936 5.35156C17.7441 5.36146 17.7927 5.37639 17.8401 5.39355C17.8827 5.40893 17.9245 5.4269 17.9651 5.44824L17.9769 5.4541C17.9933 5.46305 18.0088 5.47357 18.0247 5.4834C18.0344 5.48938 18.0445 5.49464 18.054 5.50098C18.1638 5.57421 18.258 5.66865 18.3313 5.77832C18.3996 5.88024 18.4462 5.99191 18.4729 6.10742C18.4753 6.11755 18.4787 6.12745 18.4808 6.1377C18.4948 6.20822 18.5006 6.27994 18.4993 6.35156V12.166C18.4993 12.7183 18.0516 13.166 17.4993 13.166C16.9474 13.1656 16.4993 12.718 16.4993 12.166V8.74805L11.5403 13.707C11.1498 14.0972 10.5167 14.0974 10.1263 13.707L7.49931 11.0801L3.20732 15.373C2.8168 15.7636 2.18378 15.7636 1.79326 15.373C1.40298 14.9825 1.40282 14.3494 1.79326 13.959L6.79326 8.95898L6.86943 8.89062C7.26211 8.57072 7.84133 8.59324 8.20732 8.95898L10.8333 11.585L15.0862 7.33301H11.6663C11.1142 7.33276 10.6663 6.88514 10.6663 6.33301C10.6665 5.78102 11.1143 5.33326 11.6663 5.33301H17.5003Z" />
        </svg></span>`;
    } else if (num < 0) {
        icon = `<span class="trend-icon text-warning">
        <svg class="svg-icon" aria-label="Trend Arrow Down" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.79314 5.6262C2.18367 5.23581 2.81672 5.23572 3.2072 5.6262L7.50017 9.91917L10.1261 7.29319L10.2023 7.22385C10.5951 6.90374 11.1742 6.92716 11.5402 7.29319L16.5002 12.2522V8.83323C16.5002 8.28112 16.9481 7.83341 17.5002 7.83323C18.0522 7.83343 18.5001 8.28114 18.5002 8.83323V14.6662C18.5002 14.7005 18.4978 14.7347 18.4943 14.7688C18.4856 14.8547 18.4648 14.9368 18.4357 15.0149C18.4315 15.0263 18.4277 15.0378 18.423 15.0491C18.3466 15.2332 18.2169 15.389 18.0529 15.4983C18.0452 15.5034 18.0373 15.508 18.0295 15.5129C18.0089 15.5258 17.9884 15.5386 17.967 15.55C17.9609 15.5532 17.9545 15.5557 17.9484 15.5588C17.9254 15.5704 17.9021 15.5812 17.8781 15.591C17.8684 15.595 17.8585 15.5982 17.8488 15.6018C17.8297 15.6089 17.8108 15.6163 17.7912 15.6223C17.7744 15.6274 17.7573 15.6308 17.7404 15.635C17.7248 15.6389 17.7094 15.6436 17.6935 15.6467C17.6854 15.6483 17.6772 15.6492 17.6691 15.6506C17.6468 15.6544 17.6245 15.659 17.6017 15.6614L17.5002 15.6662H11.6672C11.1149 15.6662 10.6672 15.2185 10.6672 14.6662C10.6674 14.1142 11.115 13.6662 11.6672 13.6662H15.0861L10.8332 9.41331L8.2072 12.0403C7.8167 12.4308 7.18367 12.4307 6.79314 12.0403L1.79314 7.04026C1.40261 6.64974 1.40261 6.01672 1.79314 5.6262Z" />
        </svg></span>`;
    } else {
        icon = `<span class="trend-icon text-secondary opacity-50">
        <svg aria-label="Dash" xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="svg-icon bi bi-dash-lg" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M2 8a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 8"/>
        </svg></span>`;
    }

    td.innerHTML = `<div class="text-nowrap">${growthValue} ${icon}</div>`;
}

function roundUpValue(value) {
  if (value >= 1000) {
    return Math.ceil(value / 1000) * 1000;
  } else {

    return Math.ceil(value / 100) * 100;
  }
}