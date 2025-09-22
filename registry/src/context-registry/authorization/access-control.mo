import OrderedMap "mo:base/OrderedMap";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Array "mo:base/Array";
import Iter "mo:base/Iter";

module {
    public type UserRole = {
        #admin;
        #user;
        #guest;
    };

    public type AccessControlState = {
        var adminAssigned : Bool;
        var userRoles : OrderedMap.Map<Principal, UserRole>;
    };

    public func initState() : AccessControlState {
        let principalMap = OrderedMap.Make<Principal>(Principal.compare);
        {
            var adminAssigned = false;
            var userRoles = principalMap.empty<UserRole>();
        };
    };

    // First principal that calls this function becomes admin, all other principals become users.
    public func initialize(state : AccessControlState, caller : Principal) {
        if (not Principal.isAnonymous(caller)) {
            let principalMap = OrderedMap.Make<Principal>(Principal.compare);
            switch (principalMap.get(state.userRoles, caller)) {
                case (?_) {};
                case (null) {
                    if (not state.adminAssigned) {
                        state.userRoles := principalMap.put(state.userRoles, caller, #admin);
                        state.adminAssigned := true;
                    } else {
                        state.userRoles := principalMap.put(state.userRoles, caller, #user);
                    };
                };
            };
        };
    };

    public func getUserRole(state : AccessControlState, caller : Principal) : UserRole {
        if (Principal.isAnonymous(caller)) {
            #guest;
        } else {
            let principalMap = OrderedMap.Make<Principal>(Principal.compare);
            switch (principalMap.get(state.userRoles, caller)) {
                case (?role) { role };
                case (null) {
                    Debug.trap("User is not registered");
                };
            };
        };
    };

    public func assignRole(state : AccessControlState, caller : Principal, user : Principal, role : UserRole) {
        if (not (isAdmin(state, caller))) {
            Debug.trap("Unauthorized: Only admins can assign user roles");
        };
        let principalMap = OrderedMap.Make<Principal>(Principal.compare);
        state.userRoles := principalMap.put(state.userRoles, user, role);
    };

    public func hasPermission(state : AccessControlState, caller : Principal, requiredRole : UserRole) : Bool {
        let role = getUserRole(state, caller);
        switch (role) {
            case (#admin) true;
            case (role) {
                switch (requiredRole) {
                    case (#admin) false;
                    case (#user) role == #user;
                    case (#guest) true;
                };
            };
        };
    };

    public func isAdmin(state : AccessControlState, caller : Principal) : Bool {
        getUserRole(state, caller) == #admin;
    };

    public func getAdminPrincipal(state : AccessControlState) : ?Principal {
        let principalMap = OrderedMap.Make<Principal>(Principal.compare);
        for ((principal, role) in principalMap.entries(state.userRoles)) {
            if (role == #admin) {
                return ?principal;
            };
        };
        null;
    };

    public func getAllAdmins(state : AccessControlState) : [Principal] {
        let principalMap = OrderedMap.Make<Principal>(Principal.compare);
        var admins : [Principal] = [];
        for ((principal, role) in principalMap.entries(state.userRoles)) {
            if (role == #admin) {
                admins := Array.append(admins, [principal]);
            };
        };
        admins;
    };

    public func getAdminCount(state : AccessControlState) : Nat {
        let principalMap = OrderedMap.Make<Principal>(Principal.compare);
        var count : Nat = 0;
        for ((principal, role) in principalMap.entries(state.userRoles)) {
            if (role == #admin) {
                count += 1;
            };
        };
        count;
    };

    // Stable variable support
    public func toStable(state : AccessControlState) : [(Principal, UserRole)] {
        let principalMap = OrderedMap.Make<Principal>(Principal.compare);
        Iter.toArray(principalMap.entries(state.userRoles));
    };

    public func fromStable(stableData : [(Principal, UserRole)], adminPrincipal : ?Principal) : AccessControlState {
        let principalMap = OrderedMap.Make<Principal>(Principal.compare);
        let userRoles = principalMap.fromIter<UserRole>(stableData.vals());
        let adminAssigned = switch (adminPrincipal) {
            case (null) false;
            case (?_) true;
        };
        {
            var adminAssigned;
            var userRoles;
        };
    };
};

