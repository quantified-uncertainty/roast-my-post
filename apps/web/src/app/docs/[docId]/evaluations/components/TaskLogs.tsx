import React from "react";
import { TaskDisplay } from "@/components/job";
import type { Evaluation } from "@/shared/types/databaseTypes";

interface TaskLogsProps {
  selectedVersion: NonNullable<Evaluation["versions"]>[number];
}

export function TaskLogs({ selectedVersion }: TaskLogsProps) {
  if (!selectedVersion.job?.tasks || selectedVersion.job.tasks.length === 0) {
    return (
      <div className="text-center text-gray-500">
        No tasks available for this version
      </div>
    );
  }

  return (
    <TaskDisplay 
      tasks={selectedVersion.job.tasks.map(task => ({
        ...task,
        priceInDollars: Number(task.priceInDollars)
      }))}
    />
  );
}
