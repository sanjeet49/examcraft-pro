const fs = require('fs');

const path = 'c:/Users/ZEBS/Desktop/paper_maker/src/app/dashboard/builder/page.tsx';
const lines = fs.readFileSync(path, 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('<DragDropContext'));
const end = lines.findIndex((l, i) => i > start && l.includes('</DragDropContext>'));

const replacement = `                                <DragDropContext onDragEnd={handleDragEnd}>
                                    {groupedQuestions.map((group, groupIndex) => {
                                        const isExpanded = expandedSection === groupIndex;
                                        const groupMarks = group.items.reduce((sum, item) => sum + (Number(item.q.marks) || 0), 0);
                                        const getGroupHeading = (type, customHeading) => {
                                            if (customHeading) return customHeading;
                                            switch (type) {
                                                case "MCQ": return "Tick the Correct Option";
                                                case "TF": return "Write T for True and F for False";
                                                case "MATCH": return "Match the Following";
                                                case "SHORT_ANSWER": return "Short question answer";
                                                case "LONG_ANSWER": return "Long question answer";
                                                case "DESCRIPTIVE": return "Answer the following in detail";
                                                case "MAP": return "Mark the following places on the map";
                                                case "FILL_IN_THE_BLANKS": return "Fill in the Blanks";
                                                case "DATA_TABLE": return "Analyze the Table and Answer";
                                                case "CUSTOM": return "Custom Questions";
                                                default: return "Questions";
                                            }
                                        };

                                        return (
                                            <div key={groupIndex} className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden transition-all duration-300">
                                                <button
                                                    onClick={() => setExpandedSection(isExpanded ? -1 : groupIndex)}
                                                    className={\`w-full flex items-center justify-between p-4 transition-colors \${isExpanded ? 'bg-indigo-50 border-b border-indigo-100' : 'hover:bg-gray-50'}\`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={\`p-1 rounded \${isExpanded ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}\`}>
                                                            <svg className={\`w-5 h-5 transition-transform \${isExpanded ? 'rotate-180' : ''}\`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </div>
                                                        <h3 className="font-bold text-gray-800 text-left">
                                                            Section {groupIndex + 1}: {getGroupHeading(group.type, group.customHeading)}
                                                        </h3>
                                                        <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-gray-500">
                                                            {group.items.length} items
                                                        </span>
                                                    </div>
                                                    <div className="font-bold text-sm text-indigo-600 whitespace-nowrap">
                                                        [{groupMarks} Marks]
                                                    </div>
                                                </button>

                                                {isExpanded && (
                                                    <Droppable droppableId={\`droppable-\${groupIndex}\`}>
                                                        {(provided) => (
                                                            <div className="p-4 space-y-4 bg-gray-50/50" {...provided.droppableProps} ref={provided.innerRef}>
                                                                {group.items.map(({ q, originalIndex }, innerIndex) => (
                                                                    <Draggable key={q.id} draggableId={q.id!} index={originalIndex}>
                                                                        {(provided, snapshot) => (
                                                                            <div ref={provided.innerRef} {...provided.draggableProps} className="relative">
                                                                                <Card className={\`relative overflow-hidden group \${snapshot.isDragging ? 'shadow-xl ring-2 ring-indigo-500 z-50' : ''}\`}>
                                                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-400" />
                                                                                    <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-start justify-between">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div {...provided.dragHandleProps} className="cursor-grab hover:bg-gray-100 p-1 rounded text-gray-400 hover:text-gray-600 transition-colors">
                                                                                                <GripVertical className="h-5 w-5" />
                                                                                            </div>
                                                                                            <span className="text-xs bg-gray-100 px-2 py-1 rounded font-medium text-gray-500">Global #{originalIndex + 1}</span>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className="flex items-center gap-1 text-sm bg-indigo-50 px-2 py-1 rounded text-indigo-700">
                                                                                                <Input type="number" value={q.marks || 0} onChange={(e) => updateQuestion(q.id, { marks: Number(e.target.value) })} className="w-12 h-6 p-1 text-xs text-center font-bold" />
                                                                                                <span className="font-semibold text-xs">marks</span>
                                                                                            </div>
                                                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeQuestion(q.id)}>
                                                                                                <Trash2 className="h-4 w-4" />
                                                                                            </Button>
                                                                                        </div>
                                                                                    </CardHeader>
                                                                                    <CardContent className="px-4 pb-4">
                                                                                        <div className="font-medium text-sm text-gray-800 break-words" dangerouslySetInnerHTML={{ __html: q.content?.questionText || 'No question text provided' }} />
                                                                                    </CardContent>
                                                                                </Card>
                                                                            </div>
                                                                        )}
                                                                    </Draggable>
                                                                ))}
                                                                {provided.placeholder}
                                                                <div className="flex justify-center pt-2 gap-2 flex-col items-center">
                                                                    <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 border-dashed w-full max-w-sm mt-2" onClick={() => addQuestion(group.type, group.items[group.items.length - 1].originalIndex)}>
                                                                        <Plus className="w-4 h-4 mr-2" /> Add Question to this Section
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Droppable>
                                                )}
                                            </div>
                                        );
                                    })}
                                </DragDropContext>`.split('\n');

const newLines = lines.slice(0, start).concat(replacement, lines.slice(end + 1));
fs.writeFileSync(path, newLines.join('\n'));
console.log('Fixed drag drop block.');

