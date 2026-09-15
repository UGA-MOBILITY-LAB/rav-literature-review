# Rural Autonomous Vehicle Literature Review

English speaker script with website interactions

## Before presenting

Open https://uga-mobility-lab.github.io/rav-literature-review/?v=20260914e&mode=basic at the top of the homepage. The script follows the Basic page in order and matches all 24 presentation steps. Bracketed cues are instructions for you; do not read them aloud.

Use the persistent right arrow beside **02 / EXPLANATION** to advance exactly one step. Keep **Follow explanation: on**. The left pane should locate the corresponding content automatically. If it does not, click **Locate in review**. Allow the scroll to finish before pointing.

The timestamps include clicks and short viewing pauses. Aim for a speaking pace around 135–140 words per minute; rehearse once with a timer. At 5:30 you should reach Recommendations, and at 8:00 Review Methodology. Keep questions for the end.

## 01 Overview

### 0:00–0:40  Research question

[Start on the ordinary homepage. After the first sentence, click **Presentation view**. Confirm right chapter 01, step 1/1. Point to the two vehicle images and their examples note, then to the service question and the three-part review logic.]

Today, I’ll walk you through our rural autonomous vehicle literature review. The question is straightforward: what would it take for existing AV technology to support dependable rural transportation?

We start with needs like healthcare and everyday travel, then connect them to service design and technical evidence. We’ll move down the page together, with the review on the left and its main argument on the right.

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

Third, the service has to fit the way people actually travel. If trips are scattered, a demand-responsive service may work better. If people regularly travel along the same corridor, a fixed route may make more sense. That choice affects dispatch, charging, and passenger support. The pilots give us several options to learn from, but no single model will fit every rural community.

### 2:15–2:40  Finding 4

[Advance once to step 5/6. Point to the highlighted dots and **12 / 118**. Pause for two seconds so the audience can see the distribution. Do not open a dot here.]

Now, look at the evidence behind those choices. Only twelve of the 118 records provide direct rural evidence, which is about ten percent. Most of the other studies may still be useful, but they were tested in different settings. So before we apply their findings locally, we need to ask which assumptions still hold in a rural setting.

### 2:40–3:00  Finding 5

[Advance once to step 6/6. Point to the statement about the review team’s synthesis.]

When we put these findings together, they point to a step-by-step approach. We first understand the local setting, then build a resilient onboard baseline, add support where it helps, and test the service in the field under clear conditions. But this is our way of organizing the evidence, and no single study has validated the full sequence. So at each step, we need to be clear about what success looks like.

## 03 Framework

### 3:00–3:25  Tier 1

[Advance once. Confirm chapter 03, step 1/3. Trace the two Tier 1 boxes with the cursor.]

Next, let's look at the framework. We group the capabilities into two tiers. Tier 1 covers Autonomous Driving and Fleet Management. Autonomous Driving helps the vehicle sense, localize, and respond safely. Fleet Management handles dispatch, charging, and supervision. We need both, because a capable vehicle alone does not create a dependable passenger service.

### 3:25–3:50  Tier 2

[Advance once to step 2/3. The three support modules become prominent on the right. Point across them.]

Tier 2 includes Infrastructure, Communication, and Cooperative Driving. These can support the onboard baseline when there is a specific gap. For example, a road upgrade or an extra source of information may help at a difficult location. We still have to ask whether that benefit is worth the cost and maintenance.

### 3:50–4:15  Connections and validation

[Advance once to step 3/3. Point to the framework explanation now located on the left, then the field-validation label on the right.]

These parts also affect one another. Better sensing may change the fallback strategy, while a charging limit may change how the fleet is dispatched. A field pilot lets us see how the full system works under defined conditions. So the framework gives us a practical set of questions to test.

## 04 Evidence Map

### 4:15–4:35  Read the map

[Advance once. Confirm chapter 04, step 1/3. Point to the map on the left and its three evidence roles on the right. Under **Autonomous Driving**, open **Perception - single-sensor limitations**.]

The Evidence Map connects each problem to its supporting sources and the next research question. The links organize evidence, but they do not score deployment readiness.

For example, under Autonomous Driving, open **Perception - single-sensor limitations**. The card shows why relying on one camera can be risky on rural roads and links that problem to multi-sensor fusion.

### 4:35–5:05  Inspect a source

[Advance once to step 2/3. The left pane opens **Perception — multi-sensor fusion**. Point to the trade-offs, its supporting sources, and the progression from the single-sensor limitation.]

Now let's look more closely at that example. A camera may be low-cost and easy to use, but glare, low light, faded markings, or unpaved surfaces can reduce its reliability. The supporting sources lead us to a practical question: can multi-sensor fusion improve performance under those local conditions? Remember that evidence strength and rural relevance are separate. A strong study may still need local validation before we apply it.

### 5:05–5:30  Follow a validation question

[Advance once to step 3/3. The left pane opens **Perception — adverse weather**. Point to the remaining limitation.]

From there, the map brings us to adverse weather. Using several sensors helps, but it does not remove every shared failure mode. Rain, fog, or snow can affect more than one sensor at the same time. So the local test is practical: run the combined system in those conditions and decide when it should fall back.

## 05 Recommendations

### 5:30–5:55  RAV platform and fleet operators

[Advance once. Confirm chapter 05, step 1/3. Point to the vehicle and fleet recommendations. Do not click the left recommendation cards; advancing already locates them.]

This page turns the staged strategy into five stakeholder roles. First, the RAV vehicle platform needs a resilient onboard core that can keep working when connectivity drops. Second, fleet and service operators need to match operations to thin, spread-out rural demand. That may mean on-demand trips for healthcare, fixed routes for regular travel, and clear procedures for remote supervision and safe takeover.

### 5:55–6:20  Road agencies and connectivity partners

[Advance once to step 2/3. Point to the road and connectivity responsibilities on the right.]

Third, road and infrastructure agencies should not try to upgrade every mile. They should identify the highest-risk locations, improve those selectively, and maintain reliable road data. Fourth, connectivity partners should measure coverage and latency on actual routes and plan for dead zones from the start. Network support should supplement, not replace, safety-critical onboard functions.

### 6:20–6:40  USDOT: program, policy, and pilots

[Advance once to step 3/3. Point to the proposed measures, giving the audience two seconds to scan them.]

Finally, USDOT has a direct role as a program, policy, and pilot partner. It can fund staged pilots, set common safety gates, and require comparable reporting across sites. The literature offers priorities, not one proven recipe. Those pilots should produce the rural evidence needed for the next decision.

## 06 Field pilots

### 6:40–7:10  Demand responsive service

[Advance once. Confirm chapter 06, step 1/3 and the **goMARTI** tab. Point to the photograph and the service-type label.]

Now let's look at the pilots and how they differ from our project. goMARTI in Grand Rapids, Minnesota, is a demand-responsive service for dispersed riders. It operates at low speed within a defined area, with accessible support and an onboard safety operator. Our work is not built around one operating service or one site. We use cases like this to identify what needs local testing.

### 7:10–7:35  Fixed route service

[Advance once to step 2/3. **ADASTEC** is selected automatically. Point to **Fixed route** and the location. Keep the default tab selected to preserve the timed route.]

ADASTEC at Sleeping Bear Dunes uses scheduled service on a defined route. TEDDY and CASSI add experience from parks and public sites. These programs teach us about interruptions, supervision, and service organization. Our project asks a broader question: do those lessons still hold when roads, connectivity, travel demand, and support vary across rural areas?

### 7:35–8:00  How our project is different

[Advance once to step 3/3. Point to the two service patterns in the right summary; the left locates the final pilot card.]

Unlike pilots tied to one corridor or a tight geofence, our service is not built around a fixed route. We will test dynamic dispatch and flexible routing across an approved service area. For USDOT, the key question is whether that flexibility can reach more places, shorten waits and empty travel, and use a small rural fleet more efficiently.

## 07 Review Methodology

### 8:00–8:20  Scope

[Advance once. Confirm chapter 07, step 1/3. The left methodology detail opens automatically.]

Here's what went into the review behind the site. We looked at road-vehicle research published from 2014 through 2026 across five technical modules, and we added field pilots to capture what happens in practice. To make the cut, a source had to focus on rural operations or clearly document a rural connection.

### 8:20–8:45  Search and screening

[Advance once to step 2/3. Follow the search, screening, and retention sequence on the right.]

On this page, you can also see how we found the evidence. We searched scholarly publications, authoritative reports, and official program records, then followed citations to find related work. We removed duplicates, anything we could not verify, and anything outside our scope. That left 118 records, which the website now organizes and interprets.

### 8:45–9:10  Coding

[Advance once to step 3/3. Point to the coding fields, especially study design, rural relevance, and evidence strength.]

For every record, we tracked the topic and study design, its rural relevance, the strength of the evidence, and its access status. Keeping those fields separate lets you see what supports each takeaway. One important note for USDOT: the evidence-strength label is our assessment. It is not a formal risk-of-bias measure or a deployment-readiness score.

## 08 References and citation

### 9:10–9:35  Reference list

[Advance once. Confirm chapter 08, step 1/2. Point to the bibliography on the left and reference [2] on the right. Do not open a source popup here.]

Finally, the reference list groups the sources by technical module and links directly to the original publications. This is the same review we opened earlier. You can move from a recommendation to the evidence behind it, and then decide whether the same assumptions make sense in a rural setting.

### 9:35–10:00  Closing

[Advance once to step 2/2. The left locates the website citation. Deliver the closing while this remains visible. After “Thank you,” click **Back to review** and stop the timer.]

The site also provides citation and export options, so others can reuse the review and check the evidence. If there is one point to take away, it is that rural service needs, vehicle capabilities, and evidence have to be considered together. The next step is to collect comparable data from real rural operations. That will help us make expansion decisions based on measured safety and service outcomes. Thank you.

## Rehearsal notes

- **Advance once** always means the persistent right arrow beside **02 / EXPLANATION**. It works even when the right pane has been scrolled down. There are 23 advances after entering Presentation view.
- Selecting **Perception - single-sensor limitations** at 4:15 is the only extra click-through demonstration. If you are behind schedule, point to the visible theme without opening it and keep the same spoken explanation.
- Move the cursor deliberately to the item you mention, then leave it still. Use the brief pauses for the audience to read; do not read every screen label aloud.
- If a pilot image fails to load, continue with its name, service-type label, and operating description.
- Keep this document separate from the audience-facing website. The script is aligned to website version 20260914e.
