import { callLLM, filterThinkingContent } from '../utils/llm.js'

export async function generateContent(fileContent, outline, formatSettings, llmConfig, progressCallback) {
  const style = formatSettings.contentStyle === 'detailed' ? '精细' : '概括'
  const pageCount = formatSettings.pageCount
  const avgPagesPerSection = pageCount / outline.length

  const sections = []
  let completedSections = 0
  let totalSections = 0

  // 计算总章节数（包括子章节）
  outline.forEach(section => {
    if (section.children && section.children.length > 0) {
      totalSections += section.children.length
    } else {
      totalSections += 1
    }
  })

  for (const section of outline) {
    const sectionData = {
      title: section.title,
      level: section.level,
      content: '',
      children: []
    }

    if (section.children && section.children.length > 0) {
      const childPages = avgPagesPerSection / section.children.length
      for (const child of section.children) {
        const childContent = await generateSectionContent(
          child.title,
          child.level,
          childPages,
          fileContent,
          style,
          llmConfig
        )
        sectionData.children.push({
          title: child.title,
          level: child.level,
          content: childContent
        })

        completedSections++
        if (progressCallback) {
          progressCallback(completedSections, totalSections, child.title)
        }
      }
    } else {
      const sectionContent = await generateSectionContent(
        section.title,
        section.level,
        avgPagesPerSection,
        fileContent,
        style,
        llmConfig
      )
      sectionData.content = sectionContent

      completedSections++
      if (progressCallback) {
        progressCallback(completedSections, totalSections, section.title)
      }
    }

    sections.push(sectionData)
  }

  return sections
}

async function generateSectionContent(title, level, pageCount, fileContent, style, llmConfig) {
  const pages = Math.round(pageCount)
  const sectionRequirement = getSectionRequirement(title, style, pages)

  const prompt = `你是专业的投标文件编写专家。请根据招标文件内容，专门为以下章节编写完全独特、不重复的内容。

【重要】章节标题：${title}
章节级别：${level === 1 ? '一级标题' : '二级标题'}

【强制要求 - 必须遵守】
1. 本章节内容必须完全围绕"${title}"这个主题展开
2. 禁止使用通用模板！禁止写其他章节都会有的内容！
3. 禁止出现"设计原则"、"实施保障"、"技术特点"等所有章节都有的通用内容
4. 只写本章节独有的、专业的、针对性的内容
5. 每个段落都必须与标题"${title}"直接相关
6. 内容要体现本章节的独特性和专业性

招标文件内容（必须提取与"${title}"相关的部分）：
${fileContent}

${sectionRequirement}

【写作规则】
1. 内容必须紧扣"${title}"主题
2. 只写本章节独有的内容（如：项目背景写项目独有的问题分析，技术方案写系统独有的架构设计）
3. 不要写所有章节都有的通用内容（如设计原则、实施保障等）
4. 预估篇幅：约${pages}页
5. 直接输出正文，不要JSON格式

请生成专门针对章节"${title}"的独特内容。`

  try {
    const response = await callLLM({
      apiKey: llmConfig.apiKey,
      baseUrl: llmConfig.baseUrl,
      model: llmConfig.model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的投标文件编写专家，精通各行业招标文件要求，能够编写高质量、详细完整、符合规范的投标文件。请务必编写非常详细的内容，每个要点都要展开说明，写出具体的内容、数据、措施等，不要只写简单的概述。'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.9,
      max_tokens: 8000
    })

    let content = response.choices[0].message.content

    // 过滤掉 thinking/推理内容
    content = filterThinkingContent(content)

    // 移除可能的JSON包装
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '')

    return content.trim()
  } catch (error) {
    console.error(`生成章节内容失败 (${title}):`, error)
    return generateDetailedSectionContent(title, level, style)
  }
}

function getSectionRequirement(title, style, pages) {
  // 根据章节标题生成特定的内容要求
  const titleLower = title.toLowerCase()
  
  let specificRequirements = ''
  
  // 根据不同类型的章节生成特定要求
  if (titleLower.includes('项目理解') || titleLower.includes('项目背景') || titleLower.includes('需求分析') || titleLower.includes('建设目标')) {
    specificRequirements = `
【本章节特定要求】
- 项目概况和背景介绍
- 业务需求详细分析
- 用户需求调研结果
- 建设目标和预期效果
- 与招标要求的对应关系`
  } else if (titleLower.includes('技术方案') || titleLower.includes('系统架构') || titleLower.includes('功能模块') || titleLower.includes('技术选型')) {
    specificRequirements = `
【本章节特定要求】
- 总体技术架构设计
- 系统功能详细设计
- 技术选型及理由
- 核心技术方案说明
- 系统接口设计
- 数据处理方案
- 与招标技术要求的对应关系`
  } else if (titleLower.includes('实施') || titleLower.includes('计划') || titleLower.includes('进度')) {
    specificRequirements = `
【本章节特定要求】
- 项目实施总体思路
- 详细进度计划和里程碑
- 实施阶段划分
- 关键节点和交付物
- 进度控制措施
- 人力资源投入计划`
  } else if (titleLower.includes('团队') || titleLower.includes('人员')) {
    specificRequirements = `
【本章节特定要求】
- 项目组织架构
- 核心团队成员介绍（姓名、职称、经验）
- 岗位职责分工
- 人员资质证书
- 主要人员业绩介绍`
  } else if (titleLower.includes('质量') || titleLower.includes('验收')) {
    specificRequirements = `
【本章节特定要求】
- 质量目标和质量方针
- 质量管理体系
- 质量控制措施和检验标准
- 验收标准和验收流程
- 质量保证措施`
  } else if (titleLower.includes('售后') || titleLower.includes('服务') || titleLower.includes('维护')) {
    specificRequirements = `
【本章节特定要求】
- 售后服务内容和范围
- 响应时间和承诺
- 故障处理流程
- 培训计划
- 质保期后服务方案
- 服务团队和联系方式`
  } else if (titleLower.includes('报价') || titleLower.includes('价格') || titleLower.includes('预算')) {
    specificRequirements = `
【本章节特定要求】
- 报价说明和报价原则
- 项目总价
- 分项报价明细
- 费用构成说明
- 付款方式
- 成本分析`
  } else if (titleLower.includes('风险') || titleLower.includes('安全')) {
    specificRequirements = `
【本章节特定要求】
- 风险识别和分类
- 风险评估和等级划分
- 风险应对策略
- 应急预案
- 安全防护措施`
  } else {
    specificRequirements = `
【本章节特定要求】
- 本章节的专业内容详细展开
- 与招标要求的对应关系
- 行业最佳实践应用`
  }

  if (style === '精细') {
    return `对章节"${title}"进行非常详细和深入的编写，每个要点都要详细展开说明。${specificRequirements}
预估篇幅约${pages}页，每个要点至少写300-500字。`
  } else {
    return `对章节"${title}"进行概括性编写，突出核心要点。${specificRequirements}
预估篇幅约${pages}页。`
  }
}

function generateDetailedSectionContent(title, level, style) {
  const titleLower = title.toLowerCase()
  
  // 根据不同章节标题生成不同的内容
  if (titleLower.includes('项目理解') || titleLower.includes('项目背景')) {
    return `${title}

一、项目概况
本章节详细介绍项目的背景、现状及发展需求。

1.1 项目背景
根据招标文件的描述，本项目旨在解决当前业务中存在的主要问题，提升工作效率和管理水平。项目已经过前期调研和可行性分析，具备实施条件。

1.2 建设必要性
本项目的建设是满足当前业务发展需求的必然选择，对于提升服务质量、实现业务目标具有重要意义。

二、需求分析
2.1 业务需求
通过对招标文件的详细分析，本项目需要满足以下核心业务需求：
- 需求一：详细描述...
- 需求二：详细描述...
- 需求三：详细描述...

2.2 功能需求
根据招标文件要求，系统需要具备以下核心功能：
- 功能一：详细功能说明
- 功能二：详细功能说明
- 功能三：详细功能说明

三、建设目标
3.1 总体目标
建设一个功能完善、性能优异、安全可靠的现代化系统，全面满足招标要求。

3.2 具体目标
- 短期目标：系统上线运行，满足基本业务需求
- 中期目标：优化完善，提升用户体验
- 长期目标：持续演进，适应业务发展

四、与招标要求的对应关系
本章节内容完全响应招标文件第X条关于项目理解的要求，确保对招标需求有准确、完整的理解。`
  }
  
  if (titleLower.includes('技术方案') || titleLower.includes('系统架构') || titleLower.includes('功能模块')) {
    return `${title}

一、总体技术架构
1.1 架构设计原则
本方案遵循以下架构设计原则：
- 模块化原则：采用分层架构，实现高内聚低耦合
- 可扩展原则：预留扩展接口，支持后期功能扩展
- 安全性原则：从系统设计层面保障安全
- 可靠性原则：采用高可用设计，确保系统稳定运行

1.2 系统架构
本系统采用B/S架构，包含以下层次：
- 表现层：提供用户交互界面
- 业务逻辑层：处理业务规则和数据逻辑
- 数据访问层：负责数据存储和检索
- 基础设施层：提供底层技术支持

二、功能模块设计
2.1 模块一：功能名称
功能描述：详细说明模块功能...
技术实现：采用XX技术实现...
核心流程：流程描述...

2.2 模块二：功能名称
功能描述：详细说明模块功能...
技术实现：采用XX技术实现...
核心流程：流程描述...

三、关键技术方案
3.1 技术选型
根据项目需求和技术发展趋势，选择以下关键技术：
- 前端技术：XXX
- 后端技术：XXX
- 数据库：XXX
- 中间件：XXX

3.2 性能优化方案
通过以下措施保证系统性能：
- 缓存策略
- 负载均衡
- 数据库优化

四、与招标技术要求的对应关系
本章节完全响应招标文件技术方案部分的要求，所有技术选型和方案设计均满足招标文件中规定的技术指标。`
  }
  
  if (titleLower.includes('实施') || titleLower.includes('计划') || titleLower.includes('进度')) {
    return `${title}

一、项目实施策略
1.1 实施原则
- 分阶段实施：分步推进，确保每阶段目标达成
- 循序渐进：先试点后推广，降低实施风险
- 用户参与：充分调动用户积极性

1.2 实施方法论
采用敏捷开发与传统项目管理相结合的方法论。

二、项目进度计划
2.1 总体进度安排
项目总工期：X个月

| 阶段 | 周期 | 主要工作 | 交付物 |
|------|------|----------|--------|
| 需求分析 | 2周 | 需求调研、需求确认 | 需求规格说明书 |
| 设计开发 | X周 | 系统设计、功能开发 | 系统代码 |
| 测试验收 | X周 | 系统测试、用户验收 | 测试报告 |
| 上线部署 | 2周 | 系统部署、人员培训 | 部署文档 |

2.2 里程碑计划
- M1：需求确认完成
- M2：设计评审通过
- M3：开发完成
- M4：测试通过
- M5：验收通过

三、资源投入计划
3.1 人力资源
项目经理1人，开发人员X人，测试人员X人...

3.2 设备资源
列出所需设备清单...

四、进度控制措施
- 周例会制度
- 里程碑评审
- 风险预警机制

五、与招标要求的对应关系
本章节响应招标文件关于项目实施进度的要求，承诺按期完成各阶段工作。`
  }
  
  if (titleLower.includes('团队') || titleLower.includes('人员')) {
    return `${title}

一、项目组织架构
1.1 组织结构
项目组织结构图...

1.2 职责分工
- 项目经理：负责项目整体管理
- 技术负责人：负责技术决策
- 开发人员：负责系统开发
- 测试人员：负责质量保证

二、核心团队介绍
2.1 项目经理
姓名：XXX，职称：XXX，工作经验：X年，主要业绩：...

2.2 技术负责人
姓名：XXX，职称：XXX，技术专长：...

2.3 开发团队
团队成员介绍...

三、人员资质
团队成员具备以下资质证书：
- XX工程师证书
- XX认证

四、类似项目经验
团队成员承担过以下类似项目：
- 项目一：项目名称，规模，职责
- 项目二：项目名称，规模，职责

五、与招标要求的对应关系
本章节响应招标文件对项目团队的要求，团队配置满足招标文件规定的人员资质和经验要求。`
  }
  
  if (titleLower.includes('质量') || titleLower.includes('验收')) {
    return `${title}

一、质量目标
1.1 总体目标
确保项目达到招标要求的质量标准。

1.2 具体指标
- 功能完备率：100%
- 系统可用率：99.9%
- 缺陷修复率：100%

二、质量管理体系
2.1 质量管理体系描述
建立完善的质量管理体系...

2.2 质量控制流程
需求评审 -> 设计评审 -> 代码审查 -> 测试 -> 验收

三、质量控制措施
3.1 事前控制
- 需求评审
- 设计评审

3.2 事中控制
- 代码审查
- 过程检查

3.3 事后控制
- 验收测试
- 用户确认

四、验收标准
4.1 功能验收
按照需求规格说明书逐项验证...

4.2 性能验收
- 响应时间：< X秒
- 并发用户：> X人

4.3 文档验收
提交完整项目文档...

五、与招标要求的对应关系
本章节响应招标文件中关于质量保证和验收的标准要求。`
  }
  
  if (titleLower.includes('售后') || titleLower.includes('服务') || titleLower.includes('维护')) {
    return `${title}

一、售后服务承诺
1.1 质保期服务
质保期：X年

1.2 售后服务内容
- 系统维护
- 故障处理
- 性能优化
- 咨询服务

二、响应机制
2.1 响应时间
- 紧急故障：X小时内响应
- 重大故障：X小时内响应
- 一般故障：X小时内响应

2.2 故障处理流程
故障报告 -> 故障确认 -> 故障处理 -> 验证关闭

三、培训计划
3.1 培训内容
- 系统操作培训
- 日常维护培训
- 高级管理培训

3.2 培训安排
培训时间：X天，培训人数：X人

四、质保期后服务
4.1 收费标准
维保费用：X万元/年

4.2 服务内容
继续提供维保服务...

五、与招标要求的对应关系
本章节响应招标文件中关于售后服务的全部要求。`
  }
  
  if (titleLower.includes('报价') || titleLower.includes('价格') || titleLower.includes('预算')) {
    return `${title}

一、报价说明
1.1 报价原则
- 合理低价
- 性价比最优

1.2 报价范围
本次报价包含以下内容...

二、项目总价
项目总报价：XXX万元（大写：XXX）

三、分项报价明细
| 序号 | 项目名称 | 金额（万元） | 备注 |
|------|----------|--------------|------|
| 1 | XXX | XX.XX | |
| 2 | XXX | XX.XX | |

四、费用构成说明
- 开发费用：XX%
- 实施费用：XX%
- 培训费用：XX%
- 维保费用：XX%

五、付款方式
- 合同签订后：支付XX%
- 系统上线后：支付XX%
- 验收合格后：支付XX%

六、与招标要求的对应关系
本报价完全响应招标文件的报价要求，报价明细与招标要求一一对应。`
  }
  
  // 默认内容
  return `${title}

一、章节概述
针对"${title}"这一章节，我公司进行了深入分析和研究，制定了针对性的解决方案。

二、主要内容
根据招标文件要求和行业最佳实践，本章节包含以下主要内容...

三、详细方案
3.1 方案一
详细描述...

3.2 方案二
详细描述...

四、实施措施
4.1 措施一
具体实施步骤...

4.2 措施二
具体实施步骤...

五、质量保证
建立完善的质量保证体系...

六、结论
本章节内容完全响应招标文件相关要求，确保满足招标方的实际需求。`
}
