import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  /** Get or create a conversation between a business and a client */
  async getOrCreateConversation(businessId: string, clientId: string) {
    return this.prisma.conversation.upsert({
      where: { businessId_clientId: { businessId, clientId } },
      create: { businessId, clientId },
      update: {},
      include: {
        business: { select: { id: true, name: true } },
        client:   { select: { id: true, name: true } },
      },
    })
  }

  /** Convenience for business owners — looks up their businessId from userId */
  async getOrCreateConversationForOwner(ownerId: string, clientId: string) {
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { ownerId },
      select: { id: true },
    })
    return this.getOrCreateConversation(business.id, clientId)
  }

  /** Convenience for clients — looks up the business and creates/gets a conversation */
  async getOrCreateConversationForClient(clientId: string, businessId: string) {
    await this.prisma.business.findUniqueOrThrow({ where: { id: businessId }, select: { id: true } })
    return this.getOrCreateConversation(businessId, clientId)
  }

  /** List all conversations for a user (client or business owner) — only those with ≥1 message */
  async getConversations(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: true, business: { select: { id: true } } },
    })

    const where = {
      ...(user.role === 'BUSINESS' && user.business
        ? { businessId: user.business.id }
        : { clientId: userId }),
      messages: { some: {} },   // only conversations that have at least one message
    }

    const conversations = await this.prisma.conversation.findMany({
      where,
      include: {
        business: { select: { id: true, name: true } },
        client:   { select: { id: true, name: true, photo: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return conversations.map((c) => ({
      id: c.id,
      otherName: user.role === 'BUSINESS' ? c.client.name : c.business.name,
      otherPhoto: user.role === 'BUSINESS' ? (c.client as any).photo ?? null : null,
      lastMessage: c.messages[0]?.text ?? null,
      lastMessageAt: c.messages[0]?.createdAt ?? c.createdAt,
      unread: c.messages[0] && !c.messages[0].readAt && c.messages[0].senderId !== userId,
    }))
  }

  /** Get messages in a conversation */
  async getMessages(userId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!conv) throw new NotFoundException()

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: true, business: { select: { id: true } } },
    })

    const isParticipant =
      conv.clientId === userId ||
      (user.role === 'BUSINESS' && user.business?.id === conv.businessId)

    if (!isParticipant) throw new ForbiddenException()

    // Mark incoming messages as read
    await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    })

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        text: true,
        senderId: true,
        readAt: true,
        createdAt: true,
      },
    })
  }

  /** Count unread conversations for a user */
  async getUnreadCount(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: true, business: { select: { id: true } } },
    })

    const where = {
      ...(user.role === 'BUSINESS' && user.business
        ? { businessId: user.business.id }
        : { clientId: userId }),
      messages: {
        some: {
          senderId: { not: userId },
          readAt: null,
        },
      },
    }

    const count = await this.prisma.conversation.count({ where })
    return { count }
  }

  /** Delete a conversation (only participants may delete) */
  async deleteConversation(userId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!conv) throw new NotFoundException()

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: true, business: { select: { id: true } } },
    })

    const isParticipant =
      conv.clientId === userId ||
      (user.role === 'BUSINESS' && user.business?.id === conv.businessId)

    if (!isParticipant) throw new ForbiddenException()

    await this.prisma.conversation.delete({ where: { id: conversationId } })
  }

  /** Send a message */
  async sendMessage(userId: string, conversationId: string, text: string) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!conv) throw new NotFoundException()

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: true, business: { select: { id: true } } },
    })

    const isParticipant =
      conv.clientId === userId ||
      (user.role === 'BUSINESS' && user.business?.id === conv.businessId)

    if (!isParticipant) throw new ForbiddenException()

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId, senderId: userId, text },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ])

    return message
  }
}
