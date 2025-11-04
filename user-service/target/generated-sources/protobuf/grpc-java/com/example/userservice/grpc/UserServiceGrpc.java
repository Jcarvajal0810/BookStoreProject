package com.example.userservice.grpc;

import static io.grpc.MethodDescriptor.generateFullMethodName;

/**
 */
@javax.annotation.Generated(
    value = "by gRPC proto compiler (version 1.58.0)",
    comments = "Source: user.proto")
@io.grpc.stub.annotations.GrpcGenerated
public final class UserServiceGrpc {

  private UserServiceGrpc() {}

  public static final java.lang.String SERVICE_NAME = "user.UserService";

  // Static method descriptors that strictly reflect the proto.
  private static volatile io.grpc.MethodDescriptor<com.example.userservice.grpc.UserRequest,
      com.example.userservice.grpc.UserResponse> getGetUserDataMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "GetUserData",
      requestType = com.example.userservice.grpc.UserRequest.class,
      responseType = com.example.userservice.grpc.UserResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.example.userservice.grpc.UserRequest,
      com.example.userservice.grpc.UserResponse> getGetUserDataMethod() {
    io.grpc.MethodDescriptor<com.example.userservice.grpc.UserRequest, com.example.userservice.grpc.UserResponse> getGetUserDataMethod;
    if ((getGetUserDataMethod = UserServiceGrpc.getGetUserDataMethod) == null) {
      synchronized (UserServiceGrpc.class) {
        if ((getGetUserDataMethod = UserServiceGrpc.getGetUserDataMethod) == null) {
          UserServiceGrpc.getGetUserDataMethod = getGetUserDataMethod =
              io.grpc.MethodDescriptor.<com.example.userservice.grpc.UserRequest, com.example.userservice.grpc.UserResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "GetUserData"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.example.userservice.grpc.UserRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.example.userservice.grpc.UserResponse.getDefaultInstance()))
              .setSchemaDescriptor(new UserServiceMethodDescriptorSupplier("GetUserData"))
              .build();
        }
      }
    }
    return getGetUserDataMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.example.userservice.grpc.ValidateUserRequest,
      com.example.userservice.grpc.ValidateUserResponse> getValidateUserMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "ValidateUser",
      requestType = com.example.userservice.grpc.ValidateUserRequest.class,
      responseType = com.example.userservice.grpc.ValidateUserResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.example.userservice.grpc.ValidateUserRequest,
      com.example.userservice.grpc.ValidateUserResponse> getValidateUserMethod() {
    io.grpc.MethodDescriptor<com.example.userservice.grpc.ValidateUserRequest, com.example.userservice.grpc.ValidateUserResponse> getValidateUserMethod;
    if ((getValidateUserMethod = UserServiceGrpc.getValidateUserMethod) == null) {
      synchronized (UserServiceGrpc.class) {
        if ((getValidateUserMethod = UserServiceGrpc.getValidateUserMethod) == null) {
          UserServiceGrpc.getValidateUserMethod = getValidateUserMethod =
              io.grpc.MethodDescriptor.<com.example.userservice.grpc.ValidateUserRequest, com.example.userservice.grpc.ValidateUserResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "ValidateUser"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.example.userservice.grpc.ValidateUserRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.example.userservice.grpc.ValidateUserResponse.getDefaultInstance()))
              .setSchemaDescriptor(new UserServiceMethodDescriptorSupplier("ValidateUser"))
              .build();
        }
      }
    }
    return getValidateUserMethod;
  }

  /**
   * Creates a new async stub that supports all call types for the service
   */
  public static UserServiceStub newStub(io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<UserServiceStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<UserServiceStub>() {
        @java.lang.Override
        public UserServiceStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new UserServiceStub(channel, callOptions);
        }
      };
    return UserServiceStub.newStub(factory, channel);
  }

  /**
   * Creates a new blocking-style stub that supports unary and streaming output calls on the service
   */
  public static UserServiceBlockingStub newBlockingStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<UserServiceBlockingStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<UserServiceBlockingStub>() {
        @java.lang.Override
        public UserServiceBlockingStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new UserServiceBlockingStub(channel, callOptions);
        }
      };
    return UserServiceBlockingStub.newStub(factory, channel);
  }

  /**
   * Creates a new ListenableFuture-style stub that supports unary calls on the service
   */
  public static UserServiceFutureStub newFutureStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<UserServiceFutureStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<UserServiceFutureStub>() {
        @java.lang.Override
        public UserServiceFutureStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new UserServiceFutureStub(channel, callOptions);
        }
      };
    return UserServiceFutureStub.newStub(factory, channel);
  }

  /**
   */
  public interface AsyncService {

    /**
     * <pre>
     * Obtener datos del usuario (para OrderService)
     * </pre>
     */
    default void getUserData(com.example.userservice.grpc.UserRequest request,
        io.grpc.stub.StreamObserver<com.example.userservice.grpc.UserResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getGetUserDataMethod(), responseObserver);
    }

    /**
     * <pre>
     * Validar credenciales
     * </pre>
     */
    default void validateUser(com.example.userservice.grpc.ValidateUserRequest request,
        io.grpc.stub.StreamObserver<com.example.userservice.grpc.ValidateUserResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getValidateUserMethod(), responseObserver);
    }
  }

  /**
   * Base class for the server implementation of the service UserService.
   */
  public static abstract class UserServiceImplBase
      implements io.grpc.BindableService, AsyncService {

    @java.lang.Override public final io.grpc.ServerServiceDefinition bindService() {
      return UserServiceGrpc.bindService(this);
    }
  }

  /**
   * A stub to allow clients to do asynchronous rpc calls to service UserService.
   */
  public static final class UserServiceStub
      extends io.grpc.stub.AbstractAsyncStub<UserServiceStub> {
    private UserServiceStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected UserServiceStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new UserServiceStub(channel, callOptions);
    }

    /**
     * <pre>
     * Obtener datos del usuario (para OrderService)
     * </pre>
     */
    public void getUserData(com.example.userservice.grpc.UserRequest request,
        io.grpc.stub.StreamObserver<com.example.userservice.grpc.UserResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getGetUserDataMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     * <pre>
     * Validar credenciales
     * </pre>
     */
    public void validateUser(com.example.userservice.grpc.ValidateUserRequest request,
        io.grpc.stub.StreamObserver<com.example.userservice.grpc.ValidateUserResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getValidateUserMethod(), getCallOptions()), request, responseObserver);
    }
  }

  /**
   * A stub to allow clients to do synchronous rpc calls to service UserService.
   */
  public static final class UserServiceBlockingStub
      extends io.grpc.stub.AbstractBlockingStub<UserServiceBlockingStub> {
    private UserServiceBlockingStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected UserServiceBlockingStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new UserServiceBlockingStub(channel, callOptions);
    }

    /**
     * <pre>
     * Obtener datos del usuario (para OrderService)
     * </pre>
     */
    public com.example.userservice.grpc.UserResponse getUserData(com.example.userservice.grpc.UserRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getGetUserDataMethod(), getCallOptions(), request);
    }

    /**
     * <pre>
     * Validar credenciales
     * </pre>
     */
    public com.example.userservice.grpc.ValidateUserResponse validateUser(com.example.userservice.grpc.ValidateUserRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getValidateUserMethod(), getCallOptions(), request);
    }
  }

  /**
   * A stub to allow clients to do ListenableFuture-style rpc calls to service UserService.
   */
  public static final class UserServiceFutureStub
      extends io.grpc.stub.AbstractFutureStub<UserServiceFutureStub> {
    private UserServiceFutureStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected UserServiceFutureStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new UserServiceFutureStub(channel, callOptions);
    }

    /**
     * <pre>
     * Obtener datos del usuario (para OrderService)
     * </pre>
     */
    public com.google.common.util.concurrent.ListenableFuture<com.example.userservice.grpc.UserResponse> getUserData(
        com.example.userservice.grpc.UserRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getGetUserDataMethod(), getCallOptions()), request);
    }

    /**
     * <pre>
     * Validar credenciales
     * </pre>
     */
    public com.google.common.util.concurrent.ListenableFuture<com.example.userservice.grpc.ValidateUserResponse> validateUser(
        com.example.userservice.grpc.ValidateUserRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getValidateUserMethod(), getCallOptions()), request);
    }
  }

  private static final int METHODID_GET_USER_DATA = 0;
  private static final int METHODID_VALIDATE_USER = 1;

  private static final class MethodHandlers<Req, Resp> implements
      io.grpc.stub.ServerCalls.UnaryMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.ServerStreamingMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.ClientStreamingMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.BidiStreamingMethod<Req, Resp> {
    private final AsyncService serviceImpl;
    private final int methodId;

    MethodHandlers(AsyncService serviceImpl, int methodId) {
      this.serviceImpl = serviceImpl;
      this.methodId = methodId;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("unchecked")
    public void invoke(Req request, io.grpc.stub.StreamObserver<Resp> responseObserver) {
      switch (methodId) {
        case METHODID_GET_USER_DATA:
          serviceImpl.getUserData((com.example.userservice.grpc.UserRequest) request,
              (io.grpc.stub.StreamObserver<com.example.userservice.grpc.UserResponse>) responseObserver);
          break;
        case METHODID_VALIDATE_USER:
          serviceImpl.validateUser((com.example.userservice.grpc.ValidateUserRequest) request,
              (io.grpc.stub.StreamObserver<com.example.userservice.grpc.ValidateUserResponse>) responseObserver);
          break;
        default:
          throw new AssertionError();
      }
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("unchecked")
    public io.grpc.stub.StreamObserver<Req> invoke(
        io.grpc.stub.StreamObserver<Resp> responseObserver) {
      switch (methodId) {
        default:
          throw new AssertionError();
      }
    }
  }

  public static final io.grpc.ServerServiceDefinition bindService(AsyncService service) {
    return io.grpc.ServerServiceDefinition.builder(getServiceDescriptor())
        .addMethod(
          getGetUserDataMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.example.userservice.grpc.UserRequest,
              com.example.userservice.grpc.UserResponse>(
                service, METHODID_GET_USER_DATA)))
        .addMethod(
          getValidateUserMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.example.userservice.grpc.ValidateUserRequest,
              com.example.userservice.grpc.ValidateUserResponse>(
                service, METHODID_VALIDATE_USER)))
        .build();
  }

  private static abstract class UserServiceBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoFileDescriptorSupplier, io.grpc.protobuf.ProtoServiceDescriptorSupplier {
    UserServiceBaseDescriptorSupplier() {}

    @java.lang.Override
    public com.google.protobuf.Descriptors.FileDescriptor getFileDescriptor() {
      return com.example.userservice.grpc.UserProto.getDescriptor();
    }

    @java.lang.Override
    public com.google.protobuf.Descriptors.ServiceDescriptor getServiceDescriptor() {
      return getFileDescriptor().findServiceByName("UserService");
    }
  }

  private static final class UserServiceFileDescriptorSupplier
      extends UserServiceBaseDescriptorSupplier {
    UserServiceFileDescriptorSupplier() {}
  }

  private static final class UserServiceMethodDescriptorSupplier
      extends UserServiceBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoMethodDescriptorSupplier {
    private final java.lang.String methodName;

    UserServiceMethodDescriptorSupplier(java.lang.String methodName) {
      this.methodName = methodName;
    }

    @java.lang.Override
    public com.google.protobuf.Descriptors.MethodDescriptor getMethodDescriptor() {
      return getServiceDescriptor().findMethodByName(methodName);
    }
  }

  private static volatile io.grpc.ServiceDescriptor serviceDescriptor;

  public static io.grpc.ServiceDescriptor getServiceDescriptor() {
    io.grpc.ServiceDescriptor result = serviceDescriptor;
    if (result == null) {
      synchronized (UserServiceGrpc.class) {
        result = serviceDescriptor;
        if (result == null) {
          serviceDescriptor = result = io.grpc.ServiceDescriptor.newBuilder(SERVICE_NAME)
              .setSchemaDescriptor(new UserServiceFileDescriptorSupplier())
              .addMethod(getGetUserDataMethod())
              .addMethod(getValidateUserMethod())
              .build();
        }
      }
    }
    return result;
  }
}
