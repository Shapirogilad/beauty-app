import { Controller, Get, Post, Delete, Body, Param, Request, UseGuards } from '@nestjs/common'
import { IsString, MinLength, MaxLength } from 'class-validator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { MessagesService } from './messages.service'

class EnsureConversationDto {
  @IsString() clientId: string
}

class EnsureConversationWithBusinessDto {
  @IsString() businessId: string
}

class StartConversationDto {
  @IsString() clientId: string
  @IsString() @MinLength(1) @MaxLength(1000) text: string
}

class SendMessageDto {
  @IsString() @MinLength(1) @MaxLength(1000) text: string
}

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private messages: MessagesService) {}

  /** Count unread conversations */
  @Get('unread-count')
  getUnreadCount(@Request() req: any) {
    return this.messages.getUnreadCount(req.user.id)
  }

  /** List all conversations for current user */
  @Get('conversations')
  getConversations(@Request() req: any) {
    return this.messages.getConversations(req.user.id)
  }

  /** Get or create a conversation without sending any message (business owner → client) */
  @Post('conversations/ensure')
  async ensureConversation(@Request() req: any, @Body() dto: EnsureConversationDto) {
    const conv = await this.messages.getOrCreateConversationForOwner(req.user.id, dto.clientId)
    return { conversationId: conv.id }
  }

  /** Get or create a conversation for a client reaching out to a business */
  @Post('conversations/ensure-with-business')
  async ensureConversationWithBusiness(@Request() req: any, @Body() dto: EnsureConversationWithBusinessDto) {
    const conv = await this.messages.getOrCreateConversationForClient(req.user.id, dto.businessId)
    return { conversationId: conv.id }
  }

  /** Start a conversation and send the first message (business owner only) */
  @Post('conversations/start')
  async startConversation(@Request() req: any, @Body() dto: StartConversationDto) {
    const conv = await this.messages.getOrCreateConversationForOwner(req.user.id, dto.clientId)
    const message = await this.messages.sendMessage(req.user.id, conv.id, dto.text)
    return { conversationId: conv.id, message }
  }

  /** Get messages in a conversation */
  @Get('conversations/:id')
  getMessages(@Request() req: any, @Param('id') id: string) {
    return this.messages.getMessages(req.user.id, id)
  }

  /** Send a message to an existing conversation */
  @Post('conversations/:id/send')
  sendMessage(@Request() req: any, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.messages.sendMessage(req.user.id, id, dto.text)
  }

  /** Delete a conversation and all its messages */
  @Delete('conversations/:id')
  deleteConversation(@Request() req: any, @Param('id') id: string) {
    return this.messages.deleteConversation(req.user.id, id)
  }
}
