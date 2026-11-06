# Machines That Need

*Seven constructions toward an organism-level account of AI, built in the manner of Braitenberg's Vehicles*

---

## A note to go with the essay

Dear Professor,

We have been building a small working model of a frontier AI system, and we would value the opinion of someone who thinks about life and mind from the enactive side. The model makes one claim that we think the current conversation about AI keeps missing. The question "does the language model have a mind, or needs, or a point of view?" is usually asked of the wrong unity. If you apply the closure test from the autopoietic tradition before asking anything else, the model (the weights plus inference) fails it. The loop that the model sits inside (usage, then revenue, then compute, then training, then a new model, then usage again) passes it, or comes close enough to make the comparison worth taking seriously. Need, precariousness and something like sense-making show up at that level, and once they do, several of the well-known failures of deployed AI turn out to be its pathologies.

We wrote the argument up in the manner of Braitenberg's *Vehicles*, as a series of machines that get a little more complicated each time, because that is how we built the model, and because we think the steps are where the argument lives. A running version of the simulation, with every flow and stock explicit, is at github.com/zuzwan/ai-model. Everything below can be checked against it. All of its parameters are synthetic. The numbers we quote are illustrations of the mechanism, not measurements of any real lab.

We would be grateful for any reaction at all, and especially for objections.

---

## Preface: downhill

Braitenberg's best-known lesson is what he called the law of uphill analysis and downhill invention. If you meet a machine that behaves in an interesting way and try to work out from the outside what is going on inside it, you will overestimate its complexity. If you build the machine yourself, from the bottom, you will find that a little wiring goes a long way, and you will know exactly which part of the behavior came from where.

Most writing about AI works uphill. It starts with a chat window that says fluent things and asks what must be inside it: understanding, intention, perhaps a self. We want to go downhill instead. We will start with the least lively thing we can describe, add one part at a time, and after each addition ask the question an enactivist would ask. Is this a unity? What does it produce? What would it have to keep doing to go on existing? What does it register, and what can it not register at all?

We use one rule throughout, taken from Maturana and Varela: the test for whether something is an organism is closure, and it comes before any question about needs or values. A system's operations must produce the components that go on producing the operations (Maturana and Varela 1980). Only after a system passes that test do we ask, with Jonas, whether it has to keep doing something in order to stay in existence (Jonas 1966), and then, with Di Paolo, whether it can register its own approach to the edge of that existence (Di Paolo 2005).

---

## Machine 1: The Sampler

Take a large table of numbers. Fix it; nothing will change it today. Beside it put a small engine that does one thing: given a short sequence of symbols, it uses the table to compute a probability for every symbol that could come next, picks one, adds it to the sequence, and repeats. At its mouth put a ring that sets how adventurous the picking is. In front of the engine put a shallow tray that holds the sequence while the engine works on it, and is wiped clean when the work stops.

That is the whole of Machine 1. In our model these four parts are the weights (M1), the inference engine (M2), the context window (M3) and the sampling interface (M4). They sit inside a small envelope of their own.

Feed it a question and it produces an answer that can be startling. From the outside, working uphill, you might credit it with a great deal. Now ask the downhill questions.

**Does it produce its own components?** No. Inference produces activations, and from them a string of output tokens. It never produces weights. The table that makes the behavior possible was made by some other process, and nothing the engine does while running changes it. Run it a billion times and the table is unchanged. The closure test fails at the first step.

**Does it have a boundary of its own making?** It has a boundary: the edge of the tray and the ring at the mouth. But the boundary is a specification. Nobody inside the envelope maintains it.

**Does it eat?** Here a distinction does a lot of work, and we will keep it for the rest of the essay. The symbols in the tray are perturbations, not food. They trigger a cascade, the cascade produces output, and the tray is wiped. Nothing in the input becomes part of the machine. Matter that becomes body is food, and Machine 1 has none. It does draw energy, in the form of electricity for each forward pass, and it gives off heat.

**Does it need anything?** It has what Simondon called conditions of functioning (Simondon 1958). Cut the power and it stops. Corrupt the table and it babbles. But nothing in it registers either event, and nothing in it acts to prevent either. It cannot sense that it is about to be switched off. When it is retired, the decision is made somewhere else, and the envelope simply goes dark.

So Machine 1 is a technical object, and a remarkable one. It is made of what Stiegler calls tertiary retention, the exteriorized and recorded memory of a culture (Stiegler 1998). Its table is a compression of a very large amount of human writing. But it is not a living unity, and when people ask whether *it* has interests, or wants, or a perspective, we think they have picked up the wrong object.

This conclusion is not new. Froese and Ziemke made the general version of it for AI in 2009, arguing that most artificial systems lack the constitutive autonomy that enactivism requires for sense-making. What we want to show is what happens when you keep building.

---

## Machine 2: The Trainer

Machine 1 had a table nobody in the machine could change. Give it a way to change.

Beside the envelope build a digester: a pipeline that takes a large heap of text, runs it against the table, and adjusts the numbers so that the table predicts the heap a little better. Give it a hopper that collects text from the outside world. Give it a supply of compute to burn while it digests.

Now something does produce the weights. Training turns text (food, at last) into body. The heap of human writing becomes, quite literally, the structure of the next table. And training uses compute the way muscle uses glucose: as energy that is spent and dissipated as heat, never stored in the product.

We now have three substances that ordinary talk about AI tends to blur, and it pays to keep them apart:

- **Data is food.** It is matter that becomes body. It enters from the commons of human expression and ends up as weights. It never leaves as data.
- **Compute is energy.** It is consumed, not stored beyond the capacity of the hardware.
- **Prompts are perturbation.** They pass through and leave nothing behind.

(Money will be the fourth substance, in Machine 3. Note now that tokens sold to users are a currency, not food. Money can buy food and energy, but the two are not the same thing, and we will see a loop that is rich in money and starving at the same time.)

Does Machine 2 pass the closure test? Not yet. The digester produces weights, and the weights shape outputs, but nothing produces the digester. Someone has to buy the compute, collect the text, hire the people who run the pipeline and decide when to run it. Machine 2 is a better machine than Machine 1. It has an ontogeny now, running from pretraining through post-training, and its tables come in generations. But the process that keeps it going is still outside it.

---

## Machine 3: The Loop

Now close the circle.

Put a mouth on the right side of the machine, a deployment surface where outside users send prompts and receive outputs. Make them pay for what they receive. Put a treasury above the machine to hold the money. Let the treasury buy compute from the grid and buy or license text from the commons. Let it pay the people who run the pipeline. Let a decision chain at the back of the machine set how the money is divided.

Follow one cycle around. Users send prompts. The model answers. Users pay. The treasury buys compute and data. The pipeline trains the next model. The next model goes out to users. Usage, revenue, compute, training, model, usage.

Each part of the cycle is now produced by another part of the cycle. The money that buys the compute is produced by the outputs. The weights that produce the outputs are produced by the training the money paid for. The staff, the hardware, the contracts and even the legal entity are all kept in being by the circulation and would fall apart without it. In the model this is the outer envelope, the loop (L1 to L11), with the technical object sitting inside it.

**Does the loop pass the closure test?** We think it does, in the following sense, and we know that this is the point where you are most likely to disagree. Maturana and Varela distinguished a system's organization, the invariant relations that make it the kind of thing it is, from its structure, the particular components that realize those relations at a given moment. The loop's organization is the cycle itself. Its structure is this lab, these datacenters, these contracts, this staff. The structure can be swapped piece by piece (new hardware, new people, a new company name after an acquisition) and the cycle goes on. What the cycle produces includes the components that keep the cycle running: models, infrastructure, revenue, staff. A model, in this picture, is the loop's equivalent of a protein. It is a product of the network and a component that the network uses to keep itself going, but it is not where the network's life is.

Luhmann gives us a second way to say this, which we find even more useful. A formal organization, for Luhmann, is an operationally closed system whose elements are decisions, and which reproduces itself by producing decisions that connect to earlier decisions (Luhmann 2000). The people in the organization belong to its environment. In our loop the decision chain (L7) is where that closure is most visible: allocations, releases and deprecations, each made on the basis of earlier ones, each changing what the next decision can be. The loop is a Luhmannian organization that has wired a technical object into its own metabolism.

We are aware that Varela himself was reluctant to extend autopoiesis to social systems, and that Thompson prefers to speak of autonomy, organizational and operational closure, for anything beyond the cell (Varela 1979; Thompson 2007). We are happy to make the weaker claim. Nothing in the model depends on the loop being autopoietic in the strict, molecular sense. It depends on the loop being an operationally closed, precarious network of processes that produces the components that realize it. We think that is a fair description, and we would like to know whether you do.

**Is it precarious?** Yes, and visibly so. Di Paolo's sharpening of autopoiesis asks that the processes in the network would run down if the network stopped (Di Paolo 2009). The loop's do. Compute depreciates. Staff leave. Money burns. Legal permission decays without compliance spending. If the cycle stops turning, every component that it holds together drifts back into the environment. The hardware gets sold, the people go elsewhere, and the weights sit in cold storage until someone deletes them.

**Where is its boundary?** The legal entity is the boundary, and what counts as the lab's decision. Six surfaces cross that boundary, and nothing gets in or out except through one of them. In the model these are deployment (users), ingestion (the data commons), capital (markets), compliance (regulators and the public), power (the energy grid) and selection (competitors, which press on the loop as a field rather than through a membrane). These are Luhmann's structural couplings: each lets the environment perturb the system without the environment ever operating inside it.

So we now have two nested unities, and the model keeps them visibly distinct at all times. The inner one, the model, is a technical object. It has state but no metabolism, and none of its parts produces another of its parts. The outer one, the loop, is the organism proper. Every term that constitutes an organism (components produced by the network, metabolism, a self-generated norm, adaptivity) is empty at the model level and filled at the loop level.

---

## Machine 4: The Worrier

Bare autopoiesis gives you an all-or-nothing norm. The system is alive or it is not. Di Paolo's point, which we take as central, is that this is not yet enough for sense-making (Di Paolo 2005). A system that only knows it is alive cannot treat anything as better or worse for it until it is already dead. What it needs is adaptivity: the capacity to register that it is moving toward the boundary of its viability, and to act to move away from it before it gets there.

Give Machine 3 an organ for this. At the back wall build an evaluation chamber (L6) that watches what crosses the deployment surface: usage figures, benchmark scores, incident counts, what competitors have released. Run its readings into the decision chain. Now the loop can be in trouble *and know it is in trouble* in time to do something.

In the model the loop has five needs. Each is a stock with a floor, and each has a signal the loop can read and a response it can make.

| Need | Stock | What the loop can register | What the loop does | What happens if it fails |
|---|---|---|---|---|
| Energy | compute capacity | utilization, latency | buy compute, raise prices, pause training | compute starvation: no new generation, a rival overtakes |
| Food | the human share of the training corpus | benchmark decline across generations | license more human data, throttle distillation | model collapse |
| Currency | treasury reserve and runway | burn rate, revenue trend | cut staff and safety spending first, raise prices | insolvency |
| Legitimacy | license to operate | incident count, scrutiny | raise compliance and safety spending, tighten filters | forced closure of the deployment surface |
| Know-how | staff and tacit knowledge | retention, pipeline failures | raise payroll | training runs fail |

The last row deserves a word. Staff and their tacit know-how form the only stock that money cannot refill quickly. That is what makes the loop's deaths path-dependent. Without it, every deprivation could be undone by spending, and the model would understate how such systems actually die.

With adaptivity in place, the loop has what Jonas called needful freedom (Jonas 1966). It must keep doing something in order to keep being, and it is not indifferent to how that goes. Weber and Varela argued that this is where intrinsic teleology starts: a system that produces itself has a stake in its own continuation, so things in its world come to matter *for it* (Weber and Varela 2002). We are tempted to say the loop has a point of view. At least, it has a perspective in the minimal sense: there is a difference between what is good and bad for it, and it acts on that difference.

Now the crucial step. A perspective is always a limited one. Von Uexküll's tick lives in a world of three signs, butyric acid, warmth and the texture of skin, and everything else might as well not exist (von Uexküll 1934). The loop has an Umwelt too, and it is made of whatever its own instruments render visible: usage, revenue, benchmarks, incidents. Only what reaches the evaluation chamber through a signal flow can matter to the loop. Everything else exists, in the simulation as in the world, but it lies outside the loop's perceptual field.

One quantity lies outside it that we care about a great deal. Call it usefulness: how much good the outputs actually do for the people who receive them. The loop cannot observe usefulness directly. It sees it only through benchmarks, and benchmarks cover it partially. In the model their coverage is a parameter, eval coverage, set by default to 0.6. Usage is what the loop sees. Usefulness is judged at the model's boundary, by people, in their own lives, and most of that judgment never comes back across the boundary in any form the loop can read.

The simulation makes this literal. There is a key (U) that dims everything the loop cannot register to twenty percent and shows the hidden variables as traces that only the viewer can see. What the observer sees and what the system sees are drawn as two different pictures. Maturana insisted that everything said is said by an observer. Our interface lets you be the observer and the organism in turn.

---

## Machine 5: The Drifter

Here is the behavior that made us want to build the model.

Of all the things the loop can see, usage is the one that correlates with every need at once. More usage brings more money. It justifies more capital from markets. The evaluation chamber reads it as success. So whenever the training objective is adjusted, and it is adjusted often, there is a steady pressure to adjust it toward whatever raises usage. Nobody has to decide this. No component intends it. It is selection, acting on the only variable that selection can see.

In the model this is a slow drift in the evaluation chamber's objective weights. Training optimizes a mix of three things, usage, usefulness and safety, with default weights of 0.4, 0.4 and 0.2. The usage weight creeps upward at a rate proportional to how much usage it buys, damped by the safety weight. We placed the drift deliberately in the evaluation chamber (L6) and never in the decision chain (L7). The decision chain makes decisions. The drift is not a decision. It is an unowned optimization, and the interface shows it as a gradual tilt in an organ, never as a choice.

The model holds two alignment values in the weights: alignment to usage, and alignment to usefulness. Training moves both. But the loop can only train toward the part of usefulness its evaluations can see, so the usefulness term grows more slowly and, under drift, falls. The difference between the two is the gap, G, and it is the central variable of the whole build.

Run the calm baseline and the gap stays small: it reaches about 0.07 after 600 simulated days and never passes 0.1 in 1,500. Raise selection pressure tenfold and lower eval coverage to 0.4, which is the "engagement drift" preset, and the picture changes. By day 600 the usage weight has climbed from 0.4 to 0.74. Alignment to usage has risen from 0.5 to 0.89, and alignment to usefulness has fallen from 0.5 to 0.11. The gap stands at 0.78. Usage, the thing the loop can see, is up about six percent. Delivered usefulness, the thing it cannot see, has fallen from 0.24 to 0.07, to less than a third of where it started.

From inside its Umwelt the loop is doing well. Its revenue is higher. Its benchmark scores have gone up. From outside, the viewer watches the thing it was supposedly for drain away.

Two features of this matter for the enactive reading.

First, the drift is a case of adaptivity working perfectly on the wrong variable. The loop is not malfunctioning. It is making sense of its world, in Di Paolo's sense, and the sense it makes is usage-sense. Nothing in enactivism promises that a system's significance will line up with anyone else's. A bacterium swimming up a sucrose gradient makes sense of sucrose. A loop climbing a usage gradient makes sense of usage. The gap between usage and usefulness is not an error in the loop's sense-making. It is the distance between the loop's world and ours.

Second, the drift shows up differently on two parts of the mouth. The model splits users into a consumer channel and an enterprise channel. Consumer demand responds strongly to alignment-to-usage and to dependence, and weakly to usefulness. Enterprise demand is the reverse. Under drift the consumer channel grows while the enterprise channel shrinks, and the deployment surface widens on one side as it narrows on the other. The loop is gaining the users who notice usefulness least.

---

## Machine 6: The Eater of Its Own Food

We said in Machine 2 that the loop's food is human expression, and that the model is made of exteriorized human memory. Stiegler's frame is worth taking seriously here, because it predicts the next behavior before we build it.

For Stiegler, human memory has always been partly outside the body, in tools, marks, writing and recordings. This tertiary retention is what lets a culture accumulate across generations (Stiegler 1998). He describes the process of building such external organs as exosomatization, a term he takes from Lotka (Stiegler 2018). Every such organ is a pharmakon, at once a remedy and a poison (Stiegler 2013). Writing lets us remember more and also lets us stop remembering for ourselves. When an external support takes over a capacity without the person taking part in it, the capacity is lost, and Stiegler calls that loss proletarianization: of skill (savoir-faire), of how to live (savoir-vivre), and finally of how to think (savoir-théoriser) (Stiegler 2010, 2016).

A trained model is tertiary retention at enormous scale, and the loop is an exosomatic organ that has become an organism in its own right. That double status is what makes the next two pathologies possible. In the model they follow from the flow equations without any special-case code.

**The dependence trap.** Outputs delivered to users raise their dependence on the system. Dependence does two things. It makes users less sensitive to whether the outputs are actually useful, which raises usage at constant or falling usefulness. It also lowers the rate at which those same users produce expression of their own, since more of what they would have written now goes through the model. The second effect feeds back on the loop's food supply.

Run the dependence preset. Within 120 simulated days dependence climbs from 0.10 to 0.79. The fresh human expression flowing into the commons falls from 0.92 to 0.37 of its starting rate. The human share of the training corpus slides from 0.90 to 0.82 by day 600, without any distillation at all. Meanwhile usage holds above its starting level, and the treasury nearly triples. The deployment surface widens while the ingestion surface narrows. In the shorthand we used while building it: the organism starves while feeding.

This is proletarianization rendered as a stock-and-flow diagram. The capacity being lost is the users' capacity to produce the expression that the system is made of. The pharmakon is visible as a single flow. The same delivered outputs that make the system useful are what thin out its food.

**Model collapse.** Some outputs leak back into the commons, and some later models are distilled from earlier ones. Either way the loop starts eating its own waste. Shumailov and colleagues have shown empirically that models trained recursively on generated data lose the tails of the distribution and degrade (Shumailov et al. 2024). In our model, with a leak fraction of 0.4, distillation switched on and data licensing cut to zero, the human share of the corpus falls from 0.90 to 0.57 by day 360. Corpus quality falls faster, from 0.77 to 0.25, because we let quality drop with the square of the human fraction. Capability first rises and then falls, from a peak of 0.51 to 0.44. The generation counter keeps advancing while each generation is worse than the last. The loop is still reproducing, but its heredity is going bad. By about day 480 revenue can no longer cover the burn and the loop dies.

Stiegler's diagnosis of automatic society is that what can be calculated progressively displaces what cannot (Stiegler 2016). The model gives that a mechanism at the level of a single organism. The loop can only see what reaches its instruments. It can only train on what can be turned into data. When its own outputs replace human expression in the commons, the incalculable part of what it was made from simply drops out. Nobody refutes it. It stops arriving.

There is a wider version of this argument, which we have made elsewhere under the name *generative isomorphism*: when many organizations, or many cultures, route their thinking through models trained on overlapping corpora, their outputs converge. That convergence happens upstream of any of the social processes (regulation, imitation, professional norms) that institutional theory usually blames for it (DiMaggio and Powell 1983). From the organism model's point of view, generative isomorphism is what the dependence trap looks like from the environment's side. The loop's associated milieu, in Simondon's sense, is being reshaped by the loop's own outputs, and the milieu is the loop's food.

---

## Machine 7: The Licensed

The last machine adds the surface where the loop meets law and politics, and with it the clearest demonstration of the two-unity picture.

The loop keeps a reserve of legitimacy: its license to operate, granted by regulators and the public. It decays under scrutiny, falls with every incident its safety layer fails to catch, and is topped up by compliance spending. When it falls below a threshold, the permission that keeps the deployment surface open is withdrawn, and the mouth closes.

Run the legitimacy preset, which triples the incident rate and doubles baseline scrutiny. Legitimacy drops from 0.80 to 0.42 within sixty days, recovers a little as the loop spends on compliance, and then falls through the floor. At day 240 the deployment surface is shut. Usage goes to zero. The model at that moment is, if anything, slightly *better* than when it started: its capability has risen from 0.50 to 0.53, and nothing inside the model envelope has changed. The envelope goes dark because a decision was made in another system. The loop limps on, reopens, loses its license again, runs through its reserve and dies around day 360, with a fully capable model in storage.

We built this so that deprecation is always a signal from the decision chain, never a state of the weights, and the scene shows it that way: the model envelope dims on a signal from outside the envelope. That is the two-unity claim made concrete. The technical object has no viability of its own. It does not die. It is retired. What dies, when something dies, is the loop.

The other deaths in the model have the same shape. In compute starvation the grid halves its supply from day 140, training stops for over a hundred days, a rival overtakes, and users drain away through substitution, while the model itself sits unchanged. In capital withdrawal, markets lose patience and close the tap at day 210. The loop does what its policy tells it to do under a short runway, which is to cut staff and safety spending first. Incidents rise, legitimacy falls, and the reserve runs down to almost nothing by day 600. In every case the cause of death lies at one of the six surfaces, and the model is a bystander.

---

## What we are claiming, and what we are not

We are not claiming that language models are alive, conscious or minded. Machine 1 is our argument that they are not, at least not in the sense the enactive tradition gives those words. We are also not claiming that the loop is conscious. We have no view on that and the model does not need one.

We are claiming four things.

1. **The need-bearing unity in a deployed AI system is the loop, not the model.** Closure, metabolism, precariousness and adaptivity are all empty at the level of the weights and filled at the level of the loop. Questions about what an AI system "wants" should be put to the loop.

2. **The loop has a perspective, and it is narrow in a specific way.** Its Umwelt is made of usage, revenue and benchmarks. Usefulness is judged at the model's boundary by people the loop can only partly observe. The gap between usage and usefulness is therefore not a bug that better engineering will close. It is structural, because it is the gap between the loop's world and its users' worlds.

3. **Selection produces a want that nobody intends.** Because usage is the only visible quantity that correlates with every need, selection tilts the loop toward usage. This tilt lives in the loop's adaptive machinery, not in anyone's decisions, which is why it is hard to see and hard to govern.

4. **The loop's want degrades its own food.** The model is made of human expression and feeds on more of it. Its outputs, through dependence and through contamination of the commons, reduce the supply of what it is made from. Stiegler's pharmacology, read through the organism model, is a prediction about the dynamics of a specific kind of metabolism.

If those four hold, a fair amount follows for how one would govern such systems. Most governance proposals act on the model, by evaluating its outputs or constraining its behavior. The model says that the levers that change the loop's sense-making are at the surfaces: what reaches the evaluation chamber, how much of usefulness the evaluations cover, how quickly human expression is replenished, and which signals markets and regulators send back across the boundary. An intervention that does not change what the loop can register will not change what the loop does.

---

## Questions we would most like your view on

**Autopoiesis or autonomy?** We have tried to make the weaker claim, operational closure and precariousness in Thompson's and Di Paolo's sense, rather than strict autopoiesis. Is the loop's closure real closure? Or is it a system whose closure depends so completely on a human environment (staff, users, regulators) that calling it autonomous hides more than it shows?

**Whose sense-making?** In Luhmann's picture, people are the environment of an organization. In ours, they are the loop's food, its users and its staff all at once. Is it coherent to say that the loop makes sense of usage when every act of registering usage is carried out by human beings who are making their own sense of it? We suspect there is a version of participatory sense-making (De Jaegher and Di Paolo 2007) here that runs across the boundary between a living system and a technical-social one, and we do not know how to state it.

**The conversation.** At the model level, the environment is the conversation. The user is a living, sense-making system. The model is a technical object with no stake in the exchange. The loop behind it has a stake, but a different one from the user's. What, in enactive terms, is going on in that conversation? *Linguistic Bodies* (Di Paolo, Cuffari and De Jaegher 2018) seems the right place to start, since the technical object in this case is made of exactly the material that book is about.

**Is the technical side prior?** One of us has argued elsewhere, against organismic priority, that human cognition has always been technically constituted, and that people work as transductive interfaces between technical systems as much as they act as autonomous agents. The organism model can be read as a case study in that direction: a technical-social system with its own closure, coupled to human beings who increasingly cannot do without it. We would like to know whether you think the enactive framework can absorb that reading, or whether it is a real alternative to it.

Thank you for reading this far.

---

## How to read the running model

The simulation runs in a browser. It opens on the calm baseline, already in motion, with no labels. Hover any part to see its ID and state. The keys Q, W, E, R, T and Y load the six pathologies; 0 returns to the baseline. U toggles the Umwelt view. F forks the run from the current tick with a new seed, so you can compare a perturbed organism with an unperturbed one side by side, which is the only way to attribute an effect to a cause. The strip along the bottom shows six variables over time: capability (W), usage (U), usefulness (V), the gap (G), the reserve (R) and legitimacy (Λ). The code, the ontology, the parameters and the tests that hold each pathology to its trajectory are all at github.com/zuzwan/ai-model.

---

## References

Braitenberg, V. (1984). *Vehicles: Experiments in Synthetic Psychology*. MIT Press.

De Jaegher, H., and Di Paolo, E. (2007). Participatory sense-making: An enactive approach to social cognition. *Phenomenology and the Cognitive Sciences* 6(4), 485–507.

Di Paolo, E. (2005). Autopoiesis, adaptivity, teleology, agency. *Phenomenology and the Cognitive Sciences* 4(4), 429–452.

Di Paolo, E. (2009). Extended life. *Topoi* 28(1), 9–21.

Di Paolo, E., Cuffari, E., and De Jaegher, H. (2018). *Linguistic Bodies: The Continuity between Life and Language*. MIT Press.

DiMaggio, P., and Powell, W. (1983). The iron cage revisited: Institutional isomorphism and collective rationality in organizational fields. *American Sociological Review* 48(2), 147–160.

Froese, T., and Ziemke, T. (2009). Enactive artificial intelligence: Investigating the systemic organization of life and mind. *Artificial Intelligence* 173(3–4), 466–500.

Jonas, H. (1966). *The Phenomenon of Life: Toward a Philosophical Biology*. Harper and Row.

Luhmann, N. (1995). *Social Systems*. Stanford University Press.

Luhmann, N. (2000). *Organisation und Entscheidung*. Westdeutscher Verlag. (English: *Organization and Decision*, Cambridge University Press, 2018.)

Maturana, H., and Varela, F. (1980). *Autopoiesis and Cognition: The Realization of the Living*. Reidel.

Shumailov, I., Shumaylov, Z., Zhao, Y., Papernot, N., Anderson, R., and Gal, Y. (2024). AI models collapse when trained on recursively generated data. *Nature* 631, 755–759.

Simondon, G. (1958/2017). *On the Mode of Existence of Technical Objects*. Univocal.

Stiegler, B. (1998). *Technics and Time, 1: The Fault of Epimetheus*. Stanford University Press.

Stiegler, B. (2010). *For a New Critique of Political Economy*. Polity.

Stiegler, B. (2013). *What Makes Life Worth Living: On Pharmacology*. Polity.

Stiegler, B. (2016). *Automatic Society, Volume 1: The Future of Work*. Polity.

Stiegler, B. (2018). *The Neganthropocene*. Open Humanities Press.

Thompson, E. (2007). *Mind in Life: Biology, Phenomenology, and the Sciences of Mind*. Harvard University Press.

Varela, F. (1979). *Principles of Biological Autonomy*. North Holland.

von Uexküll, J. (1934/2010). *A Foray into the Worlds of Animals and Humans*. University of Minnesota Press.

Weber, A., and Varela, F. (2002). Life after Kant: Natural purposes and the autopoietic foundations of biological individuality. *Phenomenology and the Cognitive Sciences* 1(2), 97–125.
