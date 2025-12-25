import { motion } from 'framer-motion'
import { CheckCircle2, DollarSign, Mail, Clock, FileText, AlertTriangle, Pen } from 'lucide-react'

export default function Timeline({ activities }) {
    if (!activities || activities.length === 0) {
        return (
            <div className="text-center py-8 text-body/50">
                No recent activity
            </div>
        )
    }

    // Color-coded icons by type
    const getIcon = (type) => {
        switch (type) {
            case 'check_in': return <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            case 'payment': return <DollarSign className="w-5 h-5 text-green-600" />
            case 'email': return <Mail className="w-5 h-5 text-gray-500" />
            case 'contract_created': return <FileText className="w-5 h-5 text-purple-600" />
            case 'contract_signed': return <Pen className="w-5 h-5 text-blue-600" />
            case 'breach': return <AlertTriangle className="w-5 h-5 text-red-600" />
            default: return <Clock className="w-5 h-5 text-gray-600" />
        }
    }

    const getBgColor = (type) => {
        switch (type) {
            case 'check_in': return 'bg-indigo-100'
            case 'payment': return 'bg-green-100'
            case 'email': return 'bg-gray-100'
            case 'contract_created': return 'bg-purple-100'
            case 'contract_signed': return 'bg-blue-100'
            case 'breach': return 'bg-red-100'
            default: return 'bg-gray-100'
        }
    }

    // Group activities by date
    const groupedActivities = activities.reduce((acc, item) => {
        const dateKey = item.dateKey || item.date?.split(',')[0] || 'Unknown'
        if (!acc[dateKey]) {
            acc[dateKey] = []
        }
        acc[dateKey].push(item)
        return acc
    }, {})

    const dateKeys = Object.keys(groupedActivities)

    return (
        <div className="space-y-6">
            {dateKeys.map((dateKey, groupIndex) => (
                <div key={dateKey}>
                    {/* Sticky Date Header */}
                    <div className="sticky top-0 bg-surface/95 backdrop-blur-sm py-2 z-10 mb-3">
                        <p className="text-xs font-bold text-body/60 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            {dateKey}
                        </p>
                    </div>

                    {/* Activities for this date */}
                    <div className="space-y-4 relative ml-2">
                        {/* Vertical Line */}
                        <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gray-200" />

                        {groupedActivities[dateKey].map((item, index) => (
                            <motion.div
                                key={`${dateKey}-${index}`}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="flex gap-4 relative"
                            >
                                {/* Icon */}
                                <div className="relative z-10">
                                    <div className={`w-10 h-10 rounded-full ${getBgColor(item.type)} flex items-center justify-center border-4 border-white shadow-sm`}>
                                        {getIcon(item.type)}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 pt-1">
                                    <div className="text-xs text-body/50 mb-0.5 font-medium">{item.date}</div>
                                    <div className="text-header font-semibold text-sm leading-tight mb-1">
                                        {item.title}
                                        {item.highlight && <span className="font-bold"> {item.highlight}</span>}
                                    </div>
                                    {item.description && (
                                        <div className="text-xs text-body/70 leading-relaxed">
                                            {item.description} <span className="font-semibold text-header">{item.boldText}</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
