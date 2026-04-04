import { useState } from "react";
import { Github, Linkedin, X } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";

const team = [
	{
		name: "Shirsh Gupta",
		role: "Backend Engineering",
		bio: "Backend services, API design and event-driven integrations.",
		longBio:
			"Shirsh focuses on building reliable backend services, Kafka consumers, and the API layer that powers real-time compensation triggers and wallet payouts.",
		initials: "SG",
	},
	{
		name: "Rudranshi Mittal",
		role: "Backend Engineering",
		bio: "Backend systems, data models and core business logic.",
		longBio:
			"Rudranshi works on the core server-side logic, data models and integrations that enable accurate income loss estimation and parametric triggers.",
		initials: "RM",
	},
	{
		name: "Vishakha",
		role: "Infrastructure & DevOps Engineering",
		bio: "Cloud infrastructure, CI/CD and platform reliability.",
		longBio:
			"Vishakha manages cloud infrastructure, deployment pipelines, containerization and monitoring to ensure the platform runs reliably at scale.",
		initials: "V",
	},
	{
		name: "Vikal Dubey",
		role: "Frontend Engineering",
		bio: "Designing and building the frontend experience in React and Tailwind.",
		longBio:
			"Vikal leads the UI and frontend engineering efforts — creating intuitive, responsive interfaces for workers and operations teams.",
		initials: "VD",
	},
	{
		name: "Satyarth Ojha",
		role: "Artificial Intelligence & Machine Learning Engineering",
		bio: "AI and ML models for risk prediction and fraud scoring.",
		longBio:
			"Satyarth develops the machine learning models used for route risk prediction, income loss estimation and adversarial defense.",
		initials: "SO",
	},
];

export default function TeamPage() {
	const [selectedMember, setSelectedMember] = useState<number | null>(null);

	return (
		<div className="py-16 bg-gradient-to-b from-slate-950 to-black">
			<div className="container mx-auto px-4">
				<AnimatedSection>
					<div className="text-center mb-12">
					<h1 className="font-display text-3xl md:text-5xl font-bold mb-3 text-foreground">
						Our Team
					</h1>
					<p className="text-muted-foreground max-w-2xl mx-auto">
							A focused engineering team building GigShield — practical, reliable
							income protection for gig workers.
						</p>
					</div>
				</AnimatedSection>

				<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
					{team.map((member, i) => (
						<AnimatedSection key={member.name} delay={i * 80}>
							<div
								className="rounded-xl p-6 text-center shadow-sm hover:shadow-lg transition-transform transform hover:-translate-y-1 cursor-pointer bg-card/80 backdrop-blur-sm border border-border"
								onClick={() =>
									setSelectedMember(
										selectedMember === i ? null : i
									)
								}
							>
								<div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center font-display font-bold text-xl mx-auto mb-4">
									{member.initials}
								</div>
								<h3 className="font-display font-semibold text-lg text-foreground">
									{member.name}
								</h3>
								<div className="text-sm text-muted-foreground font-medium mb-2">
									{member.role}
								</div>
								<p className="text-sm text-muted-foreground">{member.bio}</p>
								<div className="flex gap-2 justify-center mt-4">
									<a
										href="#"
										className="p-2 rounded-lg hover:bg-card/70 transition-colors"
										onClick={(e) => e.stopPropagation()}
									>
										<Github className="h-4 w-4 text-foreground" />
									</a>
									<a
										href="#"
										className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
										onClick={(e) => e.stopPropagation()}
									>
										<Linkedin className="h-4 w-4 text-foreground" />
									</a>
								</div>
							</div>
						</AnimatedSection>
					))}
				</div>

				{/* Expanded member detail */}
				{selectedMember !== null && (
					<AnimatedSection>
						<div className="max-w-2xl mx-auto mt-8">
							<div className="rounded-xl p-6 relative bg-card/80 backdrop-blur-sm border border-border shadow-md">
								<button
									onClick={() => setSelectedMember(null)}
									className="absolute top-4 right-4 p-1 rounded-md hover:bg-card/70"
								>
									<X className="h-4 w-4 text-foreground" />
								</button>
								<div className="flex items-center gap-4 mb-4">
									<div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-display font-bold">
										{team[selectedMember].initials}
									</div>
									<div>
									<h3 className="font-display font-semibold text-lg text-foreground">
										{team[selectedMember].name}
									</h3>
									<div className="text-sm text-muted-foreground font-medium">
											{team[selectedMember].role}
										</div>
									</div>
								</div>
									<p className="text-sm text-muted-foreground">
									{team[selectedMember].longBio}
								</p>
							</div>
						</div>
					</AnimatedSection>
				)}
			</div>
		</div>
	);
}
