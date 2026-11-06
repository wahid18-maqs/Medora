import { Zap, Database, Leaf } from "lucide-react";

const STACK = [
  { label: "FastAPI", icon: Zap, color: "text-emerald-500" },
  { label: "Redis", icon: Database, color: "text-red-500" },
  { label: "MongoDB", icon: Leaf, color: "text-green-600" },
];

export default function TechStackFooter() {
  return (
    <div className="flex items-center justify-around px-2 pt-4 border-t border-border">
      {STACK.map(({ label, icon: Icon, color }) => (
        <div key={label} className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground">
          <Icon size={16} className={color} />
          {label}
        </div>
      ))}
    </div>
  );
}
