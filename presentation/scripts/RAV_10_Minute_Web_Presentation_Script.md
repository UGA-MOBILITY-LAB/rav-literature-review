# Rural Autonomous Vehicle Literature Review

English speaker script with website interactions

## Before presenting

Open https://uga-mobility-lab.github.io/rav-literature-review/?v=20260914e&mode=basic at the top of the homepage. The script follows the Basic page in order and matches all 24 presentation steps. Bracketed cues are instructions for you; do not read them aloud.

Use the persistent right arrow beside **02 / EXPLANATION** to advance exactly one step. Keep **Follow explanation: on**. The left pane should locate the corresponding content automatically. If it does not, click **Locate in review**. Allow the scroll to finish before pointing.

The timestamps include clicks and short viewing pauses. Aim for a speaking pace around 135–140 words per minute; rehearse once with a timer. At 5:30 you should reach Recommendations, and at 8:00 Review Methodology. Keep questions for the end.

## 01 Overview

### 0:00–0:40  Research question

[Start on the ordinary homepage. After the first sentence, click **Presentation view**. Confirm right chapter 01, step 1/1. Point to the two vehicle images and their examples note, then to the service question and the three-part review logic.]

Today, I’ll use the website itself to walk you through our rural autonomous vehicle literature review.

The question is straightforward: what would it take for existing AV technology to support dependable rural transportation? The vehicles on screen are examples from the broader collaboration, not a complete list of project partners. We start with needs like healthcare and everyday travel, then connect them to service design and technical evidence.

We’ll move down the page together, with the review on the left and its main argument on the right.

## 02 What the Literature Says

### 0:40–1:00  Section overview

[Advance once. Confirm chapter 02, step 1/6. Point to **What the Literature Says** and its three overview statements on the left.]

Let’s start with the big picture. Rural conditions shape both the technology and the service. Lane markings may be limited, connectivity may come and go, and trips are often spread out. The takeaway is to keep the vehicle self-reliant, add support where it helps, and validate the service step by step.

### 1:00–1:25  Finding 1

[Advance once to step 2/6. The first finding opens on the left. Point to the evidence and implication rows on the right.]

First, the safety-critical basics have to stay on the vehicle. The literature gives us a solid foundation in sensing, localization, and mapping. But it does not prove that the same stack will work everywhere. We still need local testing when road markings fade, visibility drops, or roadside support is limited.

### 1:25–1:50  Finding 2

[Advance once to step 3/6. Let the second finding settle into view.]

Second, connectivity can help, but it cannot be the only thing keeping the service safe. Coverage may vary along a rural route. Before scaling up, we need to know exactly how the vehicle and the operator will respond when the connection drops or becomes unreliable.

### 1:50–2:15  Finding 3

[Advance once to step 4/6. Point to **Match the service to demand**.]

Third, service design has to match how people actually travel. Scattered trips may call for demand-responsive service, while regular travel along one corridor may fit a fixed route. That choice shapes dispatch, charging, and passenger assistance. The pilots offer several models, but none is a universal answer for rural communities.

### 2:15–2:40  Finding 4

[Advance once to step 5/6. Point to the highlighted dots and **12 / 118**. Pause for two seconds so the audience can see the distribution. Do not open a dot here.]

Now, take a look at the dots. Each one is a source. Only twelve of the 118 records provide direct rural evidence, or about ten percent. Most of the rest may transfer to rural settings, but they were not tested there. That is why we need to check the assumptions behind every local application.

### 2:40–3:00  Finding 5

[Advance once to step 6/6. Point to the statement about the review team’s synthesis.]

Putting those findings together, we see a staged path: understand the local setting, build a resilient onboard baseline, add support where it helps, and run field trials within clear limits. This is our synthesis, not a sequence validated by one study, so each stage needs clear measures.

## 03 Framework

### 3:00–3:25  Tier 1

[Advance once. Confirm chapter 03, step 1/3. Trace the two Tier 1 boxes with the cursor.]

Next, we group the capabilities into two tiers. Tier 1 covers Autonomous Driving and Fleet Management. One lets the vehicle sense, localize, and respond safely; the other handles dispatch, charging, and supervision. Both matter, because a capable vehicle alone does not guarantee a dependable passenger service.

### 3:25–3:50  Tier 2

[Advance once to step 2/3. The three support modules become prominent on the right. Point across them.]

Tier 2 covers Infrastructure, Communication, and Cooperative Driving. Think of these as targeted support for gaps in the baseline. A road upgrade or an extra source of information may help at a difficult location. The question is whether the benefit is worth the cost and upkeep. These are framework categories, not levels of vehicle automation.

### 3:50–4:15  Connections and validation

[Advance once to step 3/3. Point to the framework explanation now located on the left, then the field-validation label on the right.]

The pieces also interact. Better sensing can change the fallback strategy, and a charging constraint can change fleet dispatch. A field pilot lets us see how the whole system behaves under defined conditions. The framework turns those dependencies into questions we can test.

## 04 Evidence Map

### 4:15–4:35  Read the map

[Advance once. Confirm chapter 04, step 1/3. Point to the map on the left and its three evidence roles on the right.]

The Evidence Map makes that reasoning visible. It groups twenty-five themes into limitations, recommended directions, and reusable baselines. Select a theme to see what it means, which sources support it, and why it matters in a rural setting. The links show related questions; they are not deployment-readiness scores.

### 4:35–5:05  Inspect a source

[Advance once to step 2/3. The left pane opens **Perception — multi-sensor fusion**. After the first sentence below, click the right-side source title beginning **[2] Building the Future of Transportation**. Point to **Review** and **Transferable to rural** in the popup. Close it with **×** before advancing. Stay on this website.]

Let’s open multi-sensor fusion and look at one of the sources behind it.

This source is a review, and we coded it as transferable to rural settings. Notice that evidence strength and rural relevance are separate labels. A source can be scientifically strong and still leave an open question about whether its conclusions hold under local conditions.

### 5:05–5:30  Follow a validation question

[After closing the popup, advance once to step 3/3. The left pane opens **Perception — adverse weather**. Point to the remaining limitation.]

From there, the map takes us to adverse weather. Using several sensors helps, but it does not eliminate every shared failure mode. Rain, fog, or snow can affect multiple sensors at once. That gives us a concrete local test: run the combined system in those conditions and define when it should fall back.

## 05 Recommendations

### 5:30–5:55  Vehicle and fleet

[Advance once. Confirm chapter 05, step 1/3. Point to the vehicle and fleet recommendations. Do not click the left recommendation cards; advancing already locates them.]

Now we can turn the findings into specific tasks. Vehicle teams need to test the onboard system on local roads and in local weather. Fleet teams need dispatch, charging, and passenger support that fit the travel pattern, plus a clear supervision plan for degraded conditions.

### 5:55–6:20  Road and communication support

[Advance once to step 2/3. Point to the road and connectivity responsibilities on the right.]

Road agencies should first identify locations that repeatedly cause problems, then focus improvements there. Connectivity partners need to measure coverage and latency along the actual route rather than rely on a general map. Those measurements should drive the switching and fallback plan before the service depends on an external connection.

### 6:20–6:40  Pilot evaluation

[Advance once to step 3/3. Point to the proposed measures, giving the audience two seconds to scan them.]

Program partners also need comparable results. Interventions and disconnections tell us about technical performance. Waiting time, accessibility, and operator workload show what the service is like to use and operate. Together, these measures tell us whether the pilot answered its field question and whether a larger service area makes sense.

## 06 Field pilots

### 6:40–7:10  Demand responsive service

[Advance once. Confirm chapter 06, step 1/3 and the **goMARTI** tab. Point to the photograph and the service-type label.]

Let’s look at the pilots. goMARTI in Grand Rapids, Minnesota, is a demand-responsive rural service. It includes accessible passenger support and an onboard safety operator within a defined area. It shows how a service can respond to dispersed demand and what support still has to be in place around the vehicle.

### 7:10–7:35  Fixed route service

[Advance once to step 2/3. **ADASTEC** is selected automatically. Point to **Fixed route** and the location. Keep the default tab selected to preserve the timed route.]

ADASTEC at Sleeping Bear Dunes gives us a different model: scheduled service on a defined route. TEDDY and CASSI add experience from parks and public sites. Together, they help us compare interruptions, supervision, and service organization. But these sites are not the same as an open rural road network.

### 7:35–8:00  Compare the programs

[Advance once to step 3/3. Point to the two service patterns in the right summary; the left locates the final pilot card.]

Across these programs, context matters most. Before borrowing a service model, we need to compare the trip pattern, passenger support, and response to interruptions. Every program here operated under supervision and within defined limits. They are useful precedents for the next test, but they do not show that one model will work everywhere.

## 07 Review Methodology

### 8:00–8:20  Scope

[Advance once. Confirm chapter 07, step 1/3. The left methodology detail opens automatically.]

A quick word on methodology. We reviewed road-vehicle research published from 2014 through 2026 across five technical modules, and used field pilots to capture operational experience. To be included, a source had to focus on rural operation or make a clear, documented connection to rural use.

### 8:20–8:45  Search and screening

[Advance once to step 2/3. Follow the search, screening, and retention sequence on the right.]

We searched scholarly publications, authoritative reports, and official program records, then followed citations. During screening, we removed duplicates, records we could not verify, and work outside the review’s scope. That left 118 records. The website organizes and interprets this evidence; it is not a quantitative meta-analysis.

### 8:45–9:10  Coding

[Advance once to step 3/3. Point to the coding fields, especially study design, rural relevance, and evidence strength.]

For each record, we coded what it studied and how it related to rural operation. Study design, rural relevance, and evidence strength are separate fields, and access status is recorded on its own. That makes our interpretation easier to inspect. Evidence strength is our assessment, not a formal risk-of-bias measure or a deployment-readiness score.

## 08 References and citation

### 9:10–9:35  Reference list

[Advance once. Confirm chapter 08, step 1/2. Point to the bibliography on the left and reference [2] on the right. The source popup was demonstrated earlier; leave it closed here.]

Finally, the reference list groups sources by technical module and links directly to the original publications. Here is the same review we opened earlier. Readers can move from a recommendation to the evidence behind it, then decide whether its assumptions hold in a rural setting.

### 9:35–10:00  Closing

[Advance once to step 2/2. The left locates the website citation. Deliver the closing while this remains visible. After “Thank you,” click **Back to review** and stop the timer.]

The site ends with citation and export options, so others can reuse and check the review. The takeaway is simple: rural service needs, vehicle capabilities, and evidence have to be considered together. Next, we need comparable data from real rural operations, so expansion decisions can rest on measured safety and service outcomes. Thank you.

## Rehearsal notes

- **Advance once** always means the persistent right arrow beside **02 / EXPLANATION**. It works even when the right pane has been scrolled down. There are 23 advances after entering Presentation view.
- The source popup at 4:35 is the only extra click-through demonstration. Close it before continuing. If you are behind schedule, point to the visible source labels without opening it and keep the same spoken explanation.
- Move the cursor deliberately to the item you mention, then leave it still. Use the brief pauses for the audience to read; do not read every screen label aloud.
- If a pilot image fails to load, continue with its name, service-type label, and operating description.
- Keep this document separate from the audience-facing website. The script is aligned to website version 20260914e.
