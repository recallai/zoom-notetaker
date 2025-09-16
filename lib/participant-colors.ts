// Consistent color assignment for participants
export function getParticipantColor(index: number): string {
  const colors = [
    "bg-blue-50 text-blue-900",
    "bg-green-50 text-green-900",
    "bg-purple-50 text-purple-900",
    "bg-orange-50 text-orange-900",
    "bg-pink-50 text-pink-900",
    "bg-indigo-50 text-indigo-900",
  ];
  return colors[index % colors.length];
}
