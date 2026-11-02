import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import AsyncStorage from '@react-native-async-storage/async-storage';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId:       'us-east-1_BW3erN66K',
      userPoolClientId: '21hlt0kiclodga7mtcdi2nmrhb',
    },
  },
});

cognitoUserPoolsTokenProvider.setKeyValueStorage(AsyncStorage);
